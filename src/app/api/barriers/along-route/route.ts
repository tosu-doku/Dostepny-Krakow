import { NextRequest, NextResponse } from 'next/server';
import { getBarriersAlongRoute } from '@/services/barriers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const coordinates = body.coordinates || body.route_linestring?.coordinates;
    const bufferMeters = typeof body.buffer_meters === 'number' ? body.buffer_meters : 15.0;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return NextResponse.json(
        { error: 'Wymagane współrzędne trasy w formacie tablicy [[lng, lat], ...].' },
        { status: 400 }
      );
    }

    const barriers = await getBarriersAlongRoute(coordinates, bufferMeters);
    return NextResponse.json({
      count: barriers.length,
      buffer_meters: bufferMeters,
      barriers,
    });
  } catch (error: any) {
    console.error('API /api/barriers/along-route error:', error);
    return NextResponse.json(
      { error: error.message || 'Błąd pobierania barier wzdłuż trasy.' },
      { status: 500 }
    );
  }
}
