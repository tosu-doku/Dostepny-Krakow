const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('BŁĄD: Brak NEXT_PUBLIC_SUPABASE_URL lub NEXT_PUBLIC_SUPABASE_ANON_KEY w .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getCentroid(geometry) {
  if (!geometry) return null;
  const t = geometry.type;
  const c = geometry.coordinates;

  if (t === 'Point') {
    return { lng: c[0], lat: c[1] };
  } else if (t === 'LineString') {
    if (!c || c.length === 0) return null;
    const lng = c.reduce((s, p) => s + p[0], 0) / c.length;
    const lat = c.reduce((s, p) => s + p[1], 0) / c.length;
    return { lng, lat };
  } else if (t === 'Polygon') {
    if (!c || !c[0] || c[0].length === 0) return null;
    const pts = c[0].length > 1 ? c[0].slice(0, -1) : c[0];
    const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return { lng, lat };
  }
  return null;
}

function parseStepCount(raw) {
  if (!raw) return null;
  const num = parseInt(raw, 10);
  return isNaN(num) ? null : num;
}

async function runImport() {
  console.log('🚀 Rozpoczynam import danych rzeczywistych Krakowa do Supabase...');

  // 1. Wczytanie schodków
  const schodkiPath = path.resolve(__dirname, '../data/schodki_krakow.geojson');
  console.log(`📁 Wczytywanie: ${schodkiPath}`);
  const schodkiGeojson = JSON.parse(fs.readFileSync(schodkiPath, 'utf8'));
  console.log(`✓ Znaleziono ${schodkiGeojson.features.length} obiektów schodów.`);

  // 2. Wczytanie powierzchni
  const powierzchniePath = path.resolve(__dirname, '../data/powierzchnie_krakow.geojson');
  console.log(`📁 Wczytywanie: ${powierzchniePath}`);
  const powierzchnieGeojson = JSON.parse(fs.readFileSync(powierzchniePath, 'utf8'));
  console.log(`✓ Znaleziono ${powierzchnieGeojson.features.length} obiektów nawierzchni.`);

  // 3. Czyszczenie starych danych
  console.log('🧹 Czyszczenie starych danych z tabeli public.barriers...');
  const { error: deleteError } = await supabase
    .from('barriers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.error('Błąd podczas czyszczenia tabeli:', deleteError);
  } else {
    console.log('✓ Tabela barriers wyczyszczona.');
  }

  // 4. Transformacja schodków
  const stairsRows = [];
  for (const f of schodkiGeojson.features) {
    const pt = getCentroid(f.geometry);
    if (!pt) continue;

    const p = f.properties || {};
    const stepCount = parseStepCount(p.step_count);
    const hasRamp =
      p.ramp === 'yes' ||
      p.ramp === 'separate' ||
      p.ramp === 'wheelchair' ||
      p['ramp:wheelchair'] === 'yes' ||
      p['ramp:stroller'] === 'yes';

    const hasHandrail =
      p.handrail === 'yes' ||
      p.handrail === 'left' ||
      p.handrail === 'right' ||
      p.handrail === 'center' ||
      p['handrail:left'] === 'yes' ||
      p['handrail:right'] === 'yes';

    const tactilePaving = p.tactile_paving === 'yes' || p.tactile_paving === 'partial';

    let title = p.name || p.description;
    if (!title) {
      if (stepCount) {
        title = `Schody (${stepCount} st.)`;
      } else {
        title = 'Schody terenowe';
      }
      if (hasRamp) title += ' z podjazdem';
    }

    stairsRows.push({
      barrier_type: 'STAIRS',
      location: `SRID=4326;POINT(${pt.lng.toFixed(7)} ${pt.lat.toFixed(7)})`,
      address_description: title,
      details: {
        osm_id: p['@id'],
        step_count: stepCount,
        has_ramp: hasRamp,
        ramp_type: p['ramp:wheelchair'] || p.ramp || null,
        ramp_stroller: p['ramp:stroller'] === 'yes',
        has_handrail: hasHandrail,
        handrail_details: p.handrail || p['handrail:left'] ? 'lewa' : p['handrail:right'] ? 'prawa' : null,
        tactile_paving: tactilePaving,
        incline: p.incline || null,
        surface: p.surface || null,
        wheelchair: p.wheelchair || null,
        width: p.width ? parseFloat(p.width) || p.width : null,
        lit: p.lit === 'yes',
        geometry: f.geometry,
      },
      source: 'OSM',
      status: 'VERIFIED',
      confidence_score: 0.9,
      last_verified_at: new Date().toISOString(),
    });
  }

  // 5. Transformacja powierzchni
  const surfacesRows = [];
  for (const f of powierzchnieGeojson.features) {
    const pt = getCentroid(f.geometry);
    if (!pt) continue;

    const p = f.properties || {};
    const surfaceType = p.surface || 'sett';
    const surfaceLabel =
      surfaceType === 'sett'
        ? 'Kostka rzędowa (sett)'
        : surfaceType === 'cobblestone'
        ? 'Kocie łby (cobblestone)'
        : surfaceType === 'unhewn_cobblestone'
        ? 'Nierówny kamień polny'
        : `Bruk (${surfaceType})`;

    const title = p.name
      ? `${p.name} (${surfaceLabel})`
      : `Nawierzchnia: ${surfaceLabel}`;

    surfacesRows.push({
      barrier_type: 'COBBLESTONE_SURFACE',
      location: `SRID=4326;POINT(${pt.lng.toFixed(7)} ${pt.lat.toFixed(7)})`,
      address_description: title,
      details: {
        osm_id: p['@id'],
        name: p.name || null,
        surface: surfaceType,
        surface_label: surfaceLabel,
        smoothness: p.smoothness || null,
        highway: p.highway || null,
        wheelchair: p.wheelchair || null,
        lit: p.lit === 'yes',
        tactile_paving: p.tactile_paving === 'yes',
        is_area: p.area === 'yes' || f.geometry.type === 'Polygon',
        geometry: f.geometry,
      },
      source: 'OSM',
      status: 'VERIFIED',
      confidence_score: 0.95,
      last_verified_at: new Date().toISOString(),
    });
  }

  const allRows = [...stairsRows, ...surfacesRows];
  console.log(`📦 Łącznie przygotowano ${allRows.length} rekordów (${stairsRows.length} schodów, ${surfacesRows.length} nawierzchni).`);

  // 6. Wstawianie w paczkach (batch size = 200)
  const BATCH_SIZE = 200;
  let insertedCount = 0;
  const t0 = Date.now();

  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase.from('barriers').insert(batch);

    if (insertError) {
      console.error(`Błąd wstawiania paczki ${i} - ${i + batch.length}:`, insertError.message);
      // Spróbuj z mniejszą paczką w razie problemów
      for (let j = 0; j < batch.length; j += 50) {
        const sub = batch.slice(j, j + 50);
        const { error: subErr } = await supabase.from('barriers').insert(sub);
        if (subErr) {
          console.error(`Błąd w pod-paczce ${j}:`, subErr.message);
        } else {
          insertedCount += sub.length;
        }
      }
    } else {
      insertedCount += batch.length;
    }

    const pct = Math.round((insertedCount / allRows.length) * 100);
    process.stdout.write(`\r⏳ Postęp importu: ${insertedCount} / ${allRows.length} (${pct}%)`);
  }

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Import zakończony sukcesem w ${durationSec} s!`);
  console.log(`🎯 Wstawiono łącznie ${insertedCount} rzeczywistych barier i nawierzchni do Supabase PostGIS.`);

  // Weryfikacja liczby rekordów
  const { count } = await supabase.from('barriers').select('*', { count: 'exact', head: true });
  console.log(`📊 Aktualna liczba rekordów w tabeli barriers: ${count}`);
}

runImport().catch((err) => {
  console.error('Krytyczny błąd importu:', err);
  process.exit(1);
});
