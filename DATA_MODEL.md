# DATA_MODEL.md – Schemat Bazy Danych PostGIS

Uruchom poniższy skrypt w edytorze SQL Supabase, aby utworzyć niezbędne tabele, indeksy przestrzenne, funkcje RPC oraz polityki bezpieczeństwa (RLS).

```sql
-- 1. Poprawna instalacja i konfiguracja PostGIS w schemacie extensions
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Ustawienie 'extensions' na stałe w ścieżce wyszukiwania bazy i roli
ALTER DATABASE postgres SET search_path TO public, extensions;
ALTER ROLE postgres SET search_path TO public, extensions;
SET search_path TO public, extensions;

-- Usunięcie starych obiektów w razie ponownego uruchomienia
DROP FUNCTION IF EXISTS public.get_barriers_along_route;
DROP TABLE IF EXISTS public.barriers CASCADE;
DROP TYPE IF EXISTS public.barrier_type;
DROP TYPE IF EXISTS public.verification_status;

-- 2. Typ wyliczeniowy dla statusów wiarygodności
CREATE TYPE public.verification_status AS ENUM (
    'UNVERIFIED', 
    'COMMUNITY_CONFIRMED', 
    'VERIFIED', 
    'DISPUTED'
);

-- 3. Typ wyliczeniowy dla kategorii barier
CREATE TYPE public.barrier_type AS ENUM (
    'STAIRS', 
    'HIGH_KERB', 
    'STEEP_INCLINE', 
    'COBBLESTONE_SURFACE', 
    'NARROW_SIDEWALK', 
    'NO_TACTILE_PAVING',
    'ELEVATOR_OUT_OF_ORDER'
);

-- 4. Główna tabela barier architektonicznych (zgodna z AGENTS.md)
CREATE TABLE public.barriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Typ i lokalizacja geograficzna (WGS84)
    barrier_type public.barrier_type NOT NULL,
    location extensions.geometry(Point, 4326) NOT NULL,
    address_description TEXT,
    
    -- Szczegółowe parametry techniczne (JSONB dla elastyczności)
    -- Np. dla schodów: {"step_count": 5, "has_ramp": false, "handrail": true}
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Metadane wiarygodności i pochodzenia (wymóg AGENTS.md)
    source TEXT NOT NULL DEFAULT 'CROWDSOURCED', -- 'OSM', 'MSIP_KRAKOW', 'CROWDSOURCED'
    status public.verification_status NOT NULL DEFAULT 'UNVERIFIED',
    confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    last_verified_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    upvotes INT DEFAULT 1,
    
    -- Zdjęcie z crowdsourcingu i identyfikator użytkownika
    image_url TEXT,
    created_by UUID
);

-- 5. Indeks przestrzenny GIST zoptymalizowany pod zapytania metryczne (ST_DWithin)
CREATE INDEX barriers_geo_idx ON public.barriers USING GIST ((location::geography));

-- 6. Funkcja RPC: Znajdź przeszkody w buforze wokół wyznaczonej trasy
CREATE OR REPLACE FUNCTION public.get_barriers_along_route(
    route_linestring extensions.geometry(LineString, 4326),
    buffer_meters DOUBLE PRECISION DEFAULT 15.0
)
RETURNS SETOF public.barriers AS $$ 
BEGIN 
    RETURN QUERY 
    SELECT * 
    FROM public.barriers b 
    WHERE extensions.ST_DWithin(
        b.location::geography,
        route_linestring::geography,
        buffer_meters
    ); 
END; 
$$ LANGUAGE plpgsql STABLE;

-- 7. Uprawnienia i Row Level Security (RLS) dla Supabase
ALTER TABLE public.barriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Zezwól na publiczny odczyt barier" 
ON public.barriers FOR SELECT 
USING (true);

CREATE POLICY "Zezwól na zgłaszanie barier (Crowdsourcing)" 
ON public.barriers FOR INSERT 
WITH CHECK (true);

-- 8. Przykładowe dane testowe (Kraków)
INSERT INTO public.barriers (
  barrier_type, 
  location, 
  address_description, 
  details, 
  source, 
  status,
  confidence_score,
  last_verified_at
)
VALUES 
  (
    'STAIRS', 
    extensions.ST_SetSRID(extensions.ST_MakePoint(19.9365, 50.0614), 4326), 
    'Rynek Główny - wejście do Sukiennic', 
    '{"step_count": 6, "has_ramp": false, "handrail": true}'::jsonb, 
    'CROWDSOURCED', 
    'COMMUNITY_CONFIRMED',
    0.8,
    now()
  ),
  (
    'HIGH_KERB', 
    extensions.ST_SetSRID(extensions.ST_MakePoint(19.9380, 50.0625), 4326), 
    'ul. Szewska / Planty', 
    '{"height_cm": 15}'::jsonb, 
    'MSIP_KRAKOW', 
    'VERIFIED',
    1.0,
    now()
  ),
  (
    'ELEVATOR_OUT_OF_ORDER', 
    extensions.ST_SetSRID(extensions.ST_MakePoint(19.9450, 50.0520), 4326), 
    'Plac Nowy', 
    '{"out_of_order_since": "2026-09-01"}'::jsonb, 
    'CROWDSOURCED', 
    'UNVERIFIED',
    0.5,
    now()
  );
```