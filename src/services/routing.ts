import { Barrier } from '@/types/barrier';
import { NavigationProfile, RouteResult, RouteStep } from '@/types/routing';
import { getBarriersAlongRoute } from './barriers';

const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || '';

/**
 * Calculates geographical distance between two coordinates in meters (Haversine formula).
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Determines closest distance from a point to a polyline of coordinates.
 */
function minDistanceToPolyline(point: { lat: number; lng: number }, polyline: [number, number][]): number {
  let min = Infinity;
  for (const [lng, lat] of polyline) {
    const dist = calculateDistanceMeters(point.lat, point.lng, lat, lng);
    if (dist < min) min = dist;
  }
  return min;
}

/**
 * Returns realistic walking / rolling speed in meters per second for a given profile.
 */
export function getProfileSpeedMps(profile: NavigationProfile): number {
  switch (profile) {
    case 'wheelchair':
      return 0.89; // ~3.2 km/h (accessible pace on sidewalks)
    case 'stroller':
      return 0.97; // ~3.5 km/h (moderate stroller pace)
    case 'visually_impaired':
      return 0.83; // ~3.0 km/h (careful navigation pace)
    case 'foot_walking':
    default:
      return 1.19; // ~4.3 km/h (standard pedestrian city pace)
  }
}

/**
 * Calculates realistic duration in seconds based on distance, profile, and obstacle penalties.
 */
export function calculateRealisticDurationSeconds(
  distanceMeters: number,
  profile: NavigationProfile,
  barriers: Barrier[] = []
): number {
  const speed = getProfileSpeedMps(profile);
  let baseSeconds = distanceMeters / speed;

  // Add realistic delay for each obstacle
  for (const b of barriers) {
    if (b.barrier_type === 'STAIRS') {
      baseSeconds += profile === 'wheelchair' ? 120 : 45;
    } else if (b.barrier_type === 'HIGH_KERB') {
      baseSeconds += profile === 'wheelchair' ? 40 : 15;
    } else if (b.barrier_type === 'ELEVATOR_OUT_OF_ORDER') {
      baseSeconds += 120;
    } else {
      baseSeconds += 20;
    }
  }

  return Math.max(10, Math.round(baseSeconds));
}

/**
 * Formats raw routing step maneuvers into natural, accessible Polish navigation instructions.
 */
function formatStepInstruction(s: any): string {
  const maneuver = s.maneuver || {};
  const type = maneuver.type || '';
  const modifier = maneuver.modifier || '';
  const rawName = (s.name || '').trim();
  const streetName = rawName
    ? rawName.startsWith('ul.') || rawName.startsWith('Aleja') || rawName.startsWith('Rynek') || rawName.startsWith('Plac') || rawName.startsWith('Droga') || rawName.startsWith('Tunel')
      ? rawName
      : `ul. ${rawName}`
    : '';

  let directionText = '';
  switch (modifier) {
    case 'left':
      directionText = 'w lewo';
      break;
    case 'right':
      directionText = 'w prawo';
      break;
    case 'sharp left':
      directionText = 'ostro w lewo';
      break;
    case 'sharp right':
      directionText = 'ostro w prawo';
      break;
    case 'slight left':
      directionText = 'łagodnie w lewo';
      break;
    case 'slight right':
      directionText = 'łagodnie w prawo';
      break;
    case 'straight':
      directionText = 'prosto';
      break;
    case 'uturn':
      directionText = 'zawróć';
      break;
  }

  switch (type) {
    case 'depart':
      return streetName ? `Rozpocznij trasę wzdłuż ${streetName}` : 'Rozpocznij trasę';
    case 'arrive':
      return 'Dotarłeś do celu podróży';
    case 'turn':
      return directionText
        ? `Skręć ${directionText}${streetName ? ` w ${streetName}` : ''}`
        : streetName
        ? `Przejdź w ${streetName}`
        : 'Skręć';
    case 'continue':
    case 'new name':
      return streetName ? `Kontynuuj wzdłuż ${streetName}` : 'Idź prosto';
    case 'end of road':
      return directionText
        ? `Na końcu drogi skręć ${directionText}${streetName ? ` w ${streetName}` : ''}`
        : `Na końcu drogi ${streetName ? `wejdź w ${streetName}` : 'skręć'}`;
    case 'fork':
      return directionText
        ? `Na rozwidleniu wybierz drogę ${directionText}${streetName ? ` w ${streetName}` : ''}`
        : 'Wybierz odpowiednią odnogę';
    case 'roundabout':
    case 'rotary':
      return streetName ? `Na rondzie zjedź w ${streetName}` : 'Na rondzie zjedź odpowiednim zjazdem';
    default:
      return streetName ? `Idź wzdłuż ${streetName}` : s.instruction || 'Kontynuuj trasę';
  }
}

/**
 * Maps application profile to OpenRouteService profile name.
 */
function mapProfileToOrs(profile: NavigationProfile): string {
  switch (profile) {
    case 'wheelchair':
      return 'wheelchair';
    case 'stroller':
      return 'wheelchair';
    case 'visually_impaired':
    case 'foot_walking':
    default:
      return 'foot-walking';
  }
}

/**
 * Fetches route from OpenRouteService.
 */
async function fetchOrsRoute(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number,
  profile: NavigationProfile
): Promise<any> {
  const orsProfile = mapProfileToOrs(profile);
  const url = `https://api.openrouteservice.org/v2/directions/${orsProfile}/geojson`;

  const body = {
    coordinates: [
      [startLng, startLat],
      [endLng, endLat],
    ],
    instructions: true,
    language: 'pl',
    elevation: true,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: ORS_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // If wheelchair profile failed (e.g. strict ORS wheelchair graph has no tags in this area),
    // retry with foot-walking before giving up
    if (orsProfile === 'wheelchair') {
      const fallbackUrl = `https://api.openrouteservice.org/v2/directions/foot-walking/geojson`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: ORS_API_KEY,
        },
        body: JSON.stringify(body),
      });
      if (fallbackRes.ok) {
        return fallbackRes.json();
      }
    }
    const errText = await response.text();
    throw new Error(`OpenRouteService error (${response.status}): ${errText}`);
  }

  return response.json();
}

/**
 * Pedestrian & wheelchair routing using OpenStreetMap Foundation foot routing daemon (routed-foot).
 * Note: Never uses router.project-osrm.org (which only runs the car/driving profile and forces routes onto ring roads).
 */
async function fetchOsmFootRoute(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): Promise<any> {
  const endpoints = [
    // 1. Dedicated OpenStreetMap pedestrian router (routed-foot with foot.lua)
    `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
    // 2. Bike fallback (allows pedestrian zones and city paths, avoids motorways/heavy traffic)
    `https://routing.openstreetmap.de/routed-bike/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`,
  ];

  let lastError: any = null;
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'KrakowBezBarier/1.0 (HackYeah2026; AccessibilityRouting)',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          return data;
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Błąd trasowania pieszego OSM: ${lastError?.message || 'Brak odpowiedzi serwera'}`);
}

/**
 * Primary routing function: calculates route, queries barriers along route,
 * and classifies segments with explicit WCAG and reliability metadata.
 */
export async function calculateAccessibleRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  profile: NavigationProfile = 'wheelchair'
): Promise<RouteResult> {
  let routeGeojson: any = null;

  if (ORS_API_KEY) {
    try {
      routeGeojson = await fetchOrsRoute(start.lng, start.lat, end.lng, end.lat, profile);
    } catch (orsError) {
      console.warn('ORS routing failed, falling back to OSM foot routing:', orsError);
    }
  }

  if (!routeGeojson) {
    try {
      const osmData = await fetchOsmFootRoute(start.lng, start.lat, end.lng, end.lat);
      if (osmData?.routes?.[0]) {
        const r = osmData.routes[0];
        // Format to common structure
        routeGeojson = {
          features: [
            {
              geometry: r.geometry,
              properties: {
                summary: {
                  distance: r.distance,
                  duration: r.duration,
                },
                segments: [
                  {
                    steps: (r.legs?.[0]?.steps || []).map((s: any) => ({
                      instruction: formatStepInstruction(s),
                      distance: s.distance,
                      duration: s.duration,
                      way_points: [0, s.geometry?.coordinates?.length ? s.geometry.coordinates.length - 1 : 0],
                      stepCoordinates: s.geometry?.coordinates || [],
                    })),
                  },
                ],
              },
            },
          ],
        };
      }
    } catch (osmError) {
      console.error('All routing providers failed:', osmError);
      // Emergency direct line fallback
      routeGeojson = {
        features: [
          {
            geometry: {
              type: 'LineString',
              coordinates: [
                [start.lng, start.lat],
                [end.lng, end.lat],
              ],
            },
            properties: {
              summary: {
                distance: calculateDistanceMeters(start.lat, start.lng, end.lat, end.lng),
                duration: Math.round(calculateDistanceMeters(start.lat, start.lng, end.lat, end.lng) / 1.1),
              },
              segments: [
                {
                  steps: [
                    {
                      instruction: 'Trasa bezpośrednia (brak połączenia z serwisem trasowania)',
                      distance: calculateDistanceMeters(start.lat, start.lng, end.lat, end.lng),
                      duration: Math.round(calculateDistanceMeters(start.lat, start.lng, end.lat, end.lng) / 1.1),
                      way_points: [0, 1],
                    },
                  ],
                },
              ],
            },
          },
        ],
      };
    }
  }

  const feature = routeGeojson.features[0];
  const fullCoordinates: [number, number][] = feature.geometry.coordinates;
  const summary = feature.properties.summary;
  const rawSegments = feature.properties.segments || [];

  // Query barriers along the whole route from Supabase PostGIS
  const barriersAlongRoute = await getBarriersAlongRoute(fullCoordinates, 35.0);

  // Build route steps with AGENTS.md rule:
  // "NIGDY nie traktuj braku danych w bazie jako faktu, że przeszkody nie ma.
  // Jeśli trasa nie ma danych o krawężnikach/schodach, oznacz segment jako: Stan nieznany."
  const steps: RouteStep[] = [];
  let unverifiedStepsCount = 0;
  let highRiskCount = 0;

  for (const seg of rawSegments) {
    for (let i = 0; i < (seg.steps || []).length; i++) {
      const step = seg.steps[i];
      const startIdx = step.way_points?.[0] ?? 0;
      const endIdx = step.way_points?.[1] ?? fullCoordinates.length - 1;

      // Extract geometry for this step
      let stepCoords: [number, number][] = [];
      if (step.stepCoordinates && step.stepCoordinates.length > 0) {
        stepCoords = step.stepCoordinates;
      } else if (fullCoordinates.length > 0) {
        stepCoords = fullCoordinates.slice(startIdx, Math.min(endIdx + 1, fullCoordinates.length));
      }

      if (stepCoords.length === 0) {
        stepCoords = [[start.lng, start.lat], [end.lng, end.lat]];
      }

      // Find barriers near this step (within 35m)
      const stepBarriers = barriersAlongRoute.filter((b) => {
        const dist = minDistanceToPolyline({ lat: b.latitude, lng: b.longitude }, stepCoords);
        return dist <= 35.0;
      });

      // Assess audit status according to AGENTS.md:
      // If there are verified barriers or verified audit data, it is known.
      // If no barriers were recorded or only unverified, the default is "Stan nieznany (brak audytu)"
      const hasAuditedData = stepBarriers.some(
        (b) => b.status === 'VERIFIED' || b.source === 'MSIP_KRAKOW'
      );

      const isUnknownAudit = !hasAuditedData;
      if (isUnknownAudit) {
        unverifiedStepsCount++;
      }

      // Check for high-risk barriers for selected profile
      const hasHighRisk = stepBarriers.some((b) => {
        if (profile === 'wheelchair') {
          return (
            (b.barrier_type === 'STAIRS' && !b.details.has_ramp) ||
            b.barrier_type === 'ELEVATOR_OUT_OF_ORDER' ||
            (b.barrier_type === 'HIGH_KERB' && (b.details.height_cm || 0) > 4)
          );
        }
        if (profile === 'visually_impaired') {
          return b.barrier_type === 'NO_TACTILE_PAVING' || b.barrier_type === 'STAIRS';
        }
        return false;
      });

      if (hasHighRisk) {
        highRiskCount++;
      }

      const stepDistance = Math.round(step.distance || 0);
      const stepDuration = calculateRealisticDurationSeconds(stepDistance, profile, stepBarriers);

      steps.push({
        id: `step-${i}`,
        instruction: step.instruction || `Odcinek ${i + 1}`,
        distance_meters: stepDistance,
        duration_seconds: stepDuration,
        coordinates: stepCoords,
        audit_status: isUnknownAudit ? 'STAN_NIEZNANY' : 'STAN_ZNANY',
        audit_label: isUnknownAudit
          ? 'Stan nieznany'
          : `${stepBarriers.length} zarejestrowana(ych) bariera(er)`,
        barriers: stepBarriers,
      });
    }
  }

  const totalDistance = Math.round(summary?.distance || 0);
  const totalDuration = calculateRealisticDurationSeconds(totalDistance, profile, barriersAlongRoute);

  return {
    profile,
    total_distance_meters: totalDistance,
    total_duration_seconds: totalDuration,
    geometry: {
      type: 'LineString',
      coordinates: fullCoordinates,
    },
    steps,
    all_barriers: barriersAlongRoute,
    summary: {
      total_steps: steps.length,
      unverified_steps_count: unverifiedStepsCount,
      barrier_count: barriersAlongRoute.length,
      high_risk_barriers_count: highRiskCount,
      has_unknown_audit: unverifiedStepsCount > 0,
    },
  };
}
