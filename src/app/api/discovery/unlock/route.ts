import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/services/auth';
import { unlockTilesForUser } from '@/services/discovery';

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const sessionUser = sessionToken ? verifySessionToken(sessionToken) : null;

    const body = await req.json();
    const tileIds = Array.isArray(body.tile_ids) ? body.tile_ids : [];
    const hasPhoto = Boolean(body.has_photo);

    if (tileIds.length === 0) {
      return NextResponse.json({ message: 'Brak kafelków do odblokowania.' });
    }

    const result = await unlockTilesForUser(sessionUser?.id || null, tileIds, hasPhoto);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/discovery/unlock error:', error);
    return NextResponse.json(
      { error: error.message || 'Błąd odblokowywania kafelków.' },
      { status: 500 }
    );
  }
}
