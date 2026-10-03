import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/services/auth';
import { getUserDiscoveredTiles } from '@/services/discovery';
import { calculateUserRank } from '@/services/grid';

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const sessionUser = sessionToken ? verifySessionToken(sessionToken) : null;

    const tiles = await getUserDiscoveredTiles(sessionUser?.id || null);
    const photoCount = tiles.filter((t) => t.has_photo_contribution).length;
    const userRank = calculateUserRank(tiles.length, photoCount);

    return NextResponse.json({
      count: tiles.length,
      tiles,
      rank: userRank,
    });
  } catch (error: any) {
    console.error('API /api/discovery/my-tiles error:', error);
    return NextResponse.json(
      { error: error.message || 'Błąd pobierania kafelków użytkownika.' },
      { status: 500 }
    );
  }
}
