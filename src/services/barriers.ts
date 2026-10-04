import { Barrier, BarrierType, CreateBarrierInput, VerificationStatus } from '@/types/barrier';
import { getSupabaseAdmin, getSupabaseClient } from './supabase';
import { isUserBanned } from './auth';

/**
 * Parses PostGIS geometry in various formats (EWKB hex, WKT string, GeoJSON object)
 * into numeric [longitude, latitude].
 */
export function parseLocationCoordinates(location: unknown): { lng: number; lat: number } | null {
  if (!location) return null;

  // 1. GeoJSON format: { type: 'Point', coordinates: [lng, lat] }
  if (typeof location === 'object' && location !== null) {
    const geo = location as { coordinates?: [number, number] };
    if (Array.isArray(geo.coordinates) && geo.coordinates.length >= 2) {
      return { lng: Number(geo.coordinates[0]), lat: Number(geo.coordinates[1]) };
    }
  }

  // 2. String formats
  if (typeof location === 'string') {
    const trimmed = location.trim();

    // WKT format: POINT(lng lat)
    const wktMatch = trimmed.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (wktMatch) {
      return { lng: parseFloat(wktMatch[1]), lat: parseFloat(wktMatch[2]) };
    }

    // PostGIS EWKB / WKB hex string
    if (/^[0-9a-fA-F]+$/.test(trimmed)) {
      try {
        const buf = Buffer.from(trimmed, 'hex');
        // EWKB with SRID (25 bytes = 50 hex chars):
        // 1 byte endian + 4 bytes type (with SRID bit) + 4 bytes SRID + 8 bytes X + 8 bytes Y
        if (buf.length === 25) {
          const isLittleEndian = buf[0] === 1;
          const lng = isLittleEndian ? buf.readDoubleLE(9) : buf.readDoubleBE(9);
          const lat = isLittleEndian ? buf.readDoubleLE(17) : buf.readDoubleBE(17);
          return { lng, lat };
        }
        // Standard WKB (21 bytes = 42 hex chars):
        // 1 byte endian + 4 bytes type + 8 bytes X + 8 bytes Y
        if (buf.length === 21) {
          const isLittleEndian = buf[0] === 1;
          const lng = isLittleEndian ? buf.readDoubleLE(5) : buf.readDoubleBE(5);
          const lat = isLittleEndian ? buf.readDoubleLE(13) : buf.readDoubleBE(13);
          return { lng, lat };
        }
      } catch (err) {
        console.error('Failed to parse hex EWKB location:', err);
      }
    }
  }

  return null;
}

/**
 * Normalizes a raw database row into the strongly typed Barrier entity.
 */
export function normalizeBarrierRow(row: Record<string, any>): Barrier {
  const coords = parseLocationCoordinates(row.location);

  return {
    id: row.id,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    barrier_type: row.barrier_type as BarrierType,
    location: row.location,
    latitude: coords ? coords.lat : 0,
    longitude: coords ? coords.lng : 0,
    address_description: row.address_description,
    details: typeof row.details === 'object' && row.details !== null ? row.details : {},
    source: row.source || 'CROWDSOURCED',
    status: (row.status as VerificationStatus) || 'UNVERIFIED',
    confidence_score: typeof row.confidence_score === 'number' ? row.confidence_score : 0.5,
    last_verified_at: row.last_verified_at || new Date().toISOString(),
    upvotes: row.upvotes || 1,
    image_url: row.image_url,
    created_by: row.created_by,
  };
}

/**
 * Converts a GeoJSON LineString coordinates array to WKT format:
 * LINESTRING(lng1 lat1, lng2 lat2, ...)
 */
export function lineStringToWKT(coords: [number, number][]): string {
  const pts = coords.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  return `SRID=4326;LINESTRING(${pts})`;
}

/**
 * Deduplicates overlapping barriers at the same spot, preferring entries with photos or higher confidence.
 */
export function deduplicateBarriers(barriers: Barrier[]): Barrier[] {
  const result: Barrier[] = [];
  for (const b of barriers) {
    const isCobble = b.barrier_type === 'COBBLESTONE_SURFACE';
    const threshold = isCobble ? 0.0015 : 0.0005; // ~150m for cobblestone, ~50m for stairs/kerbs

    const existing = result.find((r) => {
      if (r.barrier_type !== b.barrier_type) return false;

      // For cobblestone, also deduplicate if they share the same street name
      if (
        isCobble &&
        r.details?.name &&
        b.details?.name &&
        String(r.details.name).trim().toLowerCase() === String(b.details.name).trim().toLowerCase()
      ) {
        return true;
      }

      return (
        Math.abs(r.latitude - b.latitude) < threshold &&
        Math.abs(r.longitude - b.longitude) < threshold
      );
    });

    if (!existing) {
      result.push(b);
    } else {
      const existingImages = Array.isArray(existing.details?.images) ? existing.details.images.length : (existing.image_url ? 1 : 0);
      const bImages = Array.isArray(b.details?.images) ? b.details.images.length : (b.image_url ? 1 : 0);
      if (bImages > existingImages || (bImages === existingImages && b.confidence_score >= existing.confidence_score)) {
        const idx = result.indexOf(existing);
        result[idx] = b;
      }
    }
  }
  return result;
}

/**
 * Fetches all barriers from Supabase.
 */
export async function getAllBarriers(): Promise<Barrier[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('barriers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all barriers:', error);
    return [];
  }

  const normalized = (data || [])
    .map(normalizeBarrierRow)
    .filter((b) => !isUserBanned(b.created_by));
  return deduplicateBarriers(normalized);
}

/**
 * Fetches barriers located along a given route using PostGIS RPC get_barriers_along_route.
 * Falls back to bounding-box search if RPC is not available.
 */
export async function getBarriersAlongRoute(
  routeCoords: [number, number][],
  bufferMeters = 15.0
): Promise<Barrier[]> {
  if (!routeCoords || routeCoords.length < 2) {
    return [];
  }

  const supabase = getSupabaseClient();
  const wkt = lineStringToWKT(routeCoords);

  // Try RPC function defined in DATA_MODEL.md
  try {
    const { data, error } = await supabase.rpc('get_barriers_along_route', {
      route_linestring: wkt,
      buffer_meters: bufferMeters,
    });

    if (!error && Array.isArray(data)) {
      return deduplicateBarriers(
        data.map(normalizeBarrierRow).filter((b) => !isUserBanned(b.created_by))
      );
    }

    if (error) {
      console.warn('RPC get_barriers_along_route failed, attempting fallback query:', error.message);
    }
  } catch (err) {
    console.warn('RPC call exception, using fallback:', err);
  }

  // Fallback: calculate bounding box of route + margin, and filter barriers
  const lngs = routeCoords.map((c) => c[0]);
  const lats = routeCoords.map((c) => c[1]);
  const minLng = Math.min(...lngs) - 0.002;
  const maxLng = Math.max(...lngs) + 0.002;
  const minLat = Math.min(...lats) - 0.002;
  const maxLat = Math.max(...lats) + 0.002;

  const all = await getAllBarriers();
  return deduplicateBarriers(
    all.filter((b) => {
      return (
        b.longitude >= minLng &&
        b.longitude <= maxLng &&
        b.latitude >= minLat &&
        b.latitude <= maxLat
      );
    })
  );
}

/**
 * Creates a new crowdsourced barrier entry in Supabase.
 */
export async function createBarrier(input: CreateBarrierInput): Promise<Barrier> {
  const supabase = getSupabaseAdmin();

  // WKT Point representation in WGS84 (SRID 4326)
  const pointWkt = `SRID=4326;POINT(${input.longitude} ${input.latitude})`;

  const payload = {
    barrier_type: input.barrier_type,
    location: pointWkt,
    address_description: input.address_description || null,
    details: input.details || {},
    source: input.source || 'CROWDSOURCED',
    status: input.status || 'UNVERIFIED',
    confidence_score: typeof input.confidence_score === 'number' ? input.confidence_score : 0.5,
    last_verified_at: new Date().toISOString(),
    image_url: input.image_url || null,
    created_by: input.created_by || null,
  };

  const { data, error } = await supabase
    .from('barriers')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error inserting barrier:', error);
    throw new Error(`Błąd zapisu bariery: ${error.message}`);
  }

  return normalizeBarrierRow(data);
}

/**
 * Uploads an image file to Supabase Storage bucket 'barriers'.
 * Returns public URL of the uploaded image.
 */
export async function uploadBarrierImage(file: Buffer, fileName: string, mimeType: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const bucketName = 'barriers';

  const cleanFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(cleanFileName, file, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.warn(`Storage upload warning (bucket "${bucketName}"):`, uploadError.message);
    return null;
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(cleanFileName);
  return data?.publicUrl || null;
}
