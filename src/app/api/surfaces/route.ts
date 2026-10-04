import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

let cachedGeoJson: any = null;

export async function GET() {
  try {
    if (!cachedGeoJson) {
      const filePath = path.join(process.cwd(), 'data', 'powierzchnie_krakow.geojson');
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        cachedGeoJson = JSON.parse(fileContent);
      } else {
        const fallbackPath = path.join(process.cwd(), 'public', 'data', 'powierzchnie_krakow.geojson');
        const fileContent = fs.readFileSync(fallbackPath, 'utf8');
        cachedGeoJson = JSON.parse(fileContent);
      }
    }

    return NextResponse.json(cachedGeoJson, {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error: any) {
    console.error('API /api/surfaces GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Błąd ładowania danych o nawierzchniach.' },
      { status: 500 }
    );
  }
}
