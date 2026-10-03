import { NextRequest, NextResponse } from 'next/server';
import { calculateAccessibleRoute } from '@/services/routing';
import { NavigationProfile } from '@/types/routing';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { start, end, profile } = body;

    if (!start?.lat || !start?.lng || !end?.lat || !end?.lng) {
      return NextResponse.json(
        { error: 'Brakujące współrzędne startu lub celu (wymagane: lat, lng).' },
        { status: 400 }
      );
    }

    const navProfile: NavigationProfile = profile || 'wheelchair';
    const result = await calculateAccessibleRoute(start, end, navProfile);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/route error:', error);
    return NextResponse.json(
      { error: error.message || 'Wystąpił błąd podczas wyznaczania trasy.' },
      { status: 500 }
    );
  }
}
