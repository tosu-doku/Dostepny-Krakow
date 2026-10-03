import { NextResponse } from 'next/server';
import { getCityExplorationSummary } from '@/services/discovery';

export async function GET() {
  try {
    const summary = await getCityExplorationSummary();
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('API /api/discovery/city-stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Błąd pobierania statystyk eksploracji miasta.' },
      { status: 500 }
    );
  }
}
