# DATA_MODEL.md – Schemat Bazy Danych PostGIS

Uruchom poniższy skrypt w edytorze SQL Supabase, aby utworzyć niezbędne tabele i indeksy przestrzenne.

```sql
-- Włączenie rozszerzenia geoprzestrzennego
CREATE EXTENSION IF NOT EXISTS postgis;

-- Typ wyliczeniowy dla statusów wiarygodności
CREATE TYPE verification_status AS ENUM (
    'UNVERIFIED', 
    'COMMUNITY_CONFIRMED', 
    'VERIFIED', 
    'DISPUTED'
);

-- Typ wyliczeniowy dla kategorii barier
CREATE TYPE barrier_type AS ENUM (
    'STAIRS', 
    'HIGH_KERB', 
    'STEEP_INCLINE', 
    'COBBLESTONE_SURFACE', 
    'NARROW_SIDEWALK', 
    'NO_TACTILE_PAVING',
    'ELEVATOR_OUT_OF_ORDER'
);

-- Główna tabela barier architektonicznych
CREATE TABLE public.barriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Typ i lokalizacja geograficzna (WGS84)
    barrier_type barrier_type NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    address_description TEXT,
    
    -- Szczegółowe parametry techniczne (JSONB dla elastyczności)
    -- Np. dla schodów: {"step_count": 5, "has_ramp": false, "handrail": true}
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Metadane wiarygodności i pochodzenia
    source TEXT NOT NULL DEFAULT 'CROWDSOURCED', -- 'OSM', 'MSIP_KRAKOW', 'CROWDSOURCED'
    status verification_status NOT NULL DEFAULT 'UNVERIFIED',
    confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    upvotes INT DEFAULT 1,
    
    -- Zdjęcie z crowdsourcingu
    image_url TEXT,
    created_by UUID -- Opcjonalny identyfikator użytkownika
);

-- Indeks przestrzenny GIST dla błyskawicznego wyszukiwania barier wzdłuż trasy
CREATE INDEX barriers_geo_idx ON public.barriers USING GIST (location);

-- Przykładowa funkcja RPC: Znajdź przeszkody w buforze wokół wyznaczonej trasy
CREATE OR REPLACE FUNCTION get_barriers_along_route(
    route_linestring GEOMETRY(LineString, 4326),
    buffer_meters DOUBLE PRECISION DEFAULT 15.0
)
RETURNS SETOF public.barriers AS $$ BEGIN     RETURN QUERY     SELECT *     FROM public.barriers b     WHERE ST_DWithin(         b.location::geography,         route_linestring::geography,         buffer_meters     ); END; $$ LANGUAGE plpgsql;
```