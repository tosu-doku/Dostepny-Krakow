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

CREATE POLICY "Zezwól na usuwanie barier" 
ON public.barriers FOR DELETE 
USING (true);

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

---

## 9. Tabela Użytkowników (`public.users`) & Bezpieczeństwo Danych

W celu powiązania zgłoszeń i zdjęć z użytkownikami, zbierania wiarygodnych danych oraz ochrony bazy przed nadużyciami (spamerzy / bad actors), wdrożono dedykowaną tabelę `public.users`.

```sql
-- 9. Tabela Użytkowników
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    is_banned BOOLEAN DEFAULT false NOT NULL,
    role TEXT DEFAULT 'USER' NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON public.users(nickname);

-- 10. Powiązanie tabeli barier ze zgłaszającym użytkownikiem
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'barriers' 
          AND column_name = 'created_by'
    ) THEN 
        ALTER TABLE public.barriers ADD COLUMN created_by UUID;
    END IF;
END $$;

DO $$
BEGIN
    -- Wyczyszczenie osieroconych referencji przed nałożeniem klucza
    UPDATE public.barriers 
    SET created_by = NULL 
    WHERE created_by IS NOT NULL 
      AND created_by NOT IN (SELECT id FROM public.users);

    -- Nałożenie klucza obcego
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_barriers_created_by'
    ) THEN
        ALTER TABLE public.barriers
        ADD CONSTRAINT fk_barriers_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.users(id)
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_barriers_created_by ON public.barriers(created_by);

-- Polityka usuwania barier (dla procedury czyszczenia Bad Actora)
DROP POLICY IF EXISTS "Zezwól na usuwanie barier" ON public.barriers;
CREATE POLICY "Zezwól na usuwanie barier" 
ON public.barriers FOR DELETE 
USING (true);

-- 11. Polityki Row Level Security dla tabeli users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Zezwól na rejestrację kont" ON public.users;
CREATE POLICY "Zezwól na rejestrację kont" 
ON public.users FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Zezwól na odczyt kont przez aplikację" ON public.users;
CREATE POLICY "Zezwól na odczyt kont przez aplikację" 
ON public.users FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Zezwól na aktualizację konta" ON public.users;
CREATE POLICY "Zezwól na aktualizację konta" 
ON public.users FOR UPDATE 
USING (true);

-- 12. Procedura RPC do czyszczenia naruszeń Bad Actora (Purge)
-- Blokuje konto użytkownika, usuwa jego wpisy z tabeli barier i zwraca URL-e wgranych zdjęć
CREATE OR REPLACE FUNCTION public.purge_bad_actor_contributions(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    purged_barriers INT := 0;
    deleted_image_urls TEXT[];
    user_record public.users%ROWTYPE;
BEGIN
    SELECT * INTO user_record FROM public.users WHERE id = target_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Użytkownik o podanym ID nie istnieje');
    END IF;

    -- Oznacz jako zablokowany
    UPDATE public.users 
    SET is_banned = true, updated_at = now() 
    WHERE id = target_user_id;

    -- Pobierz adresy URL zdjęć do skasowania ze storage
    SELECT COALESCE(ARRAY_AGG(image_url), ARRAY[]::TEXT[]) INTO deleted_image_urls
    FROM public.barriers
    WHERE created_by = target_user_id AND image_url IS NOT NULL;

    -- Usuń bariery dodane przez użytkownika
    WITH deleted_rows AS (
        DELETE FROM public.barriers
        WHERE created_by = target_user_id
        RETURNING id
    )
    SELECT COUNT(*) INTO purged_barriers FROM deleted_rows;

    RETURN jsonb_build_object(
        'success', true,
        'bad_actor_id', target_user_id,
        'nickname', user_record.nickname,
        'email', user_record.email,
        'purged_barriers_count', purged_barriers,
        'image_urls_to_remove', deleted_image_urls
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Widok bezpiecznych profili publicznych
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
    u.id,
    u.nickname,
    u.created_at,
    u.is_banned,
    (SELECT COUNT(*) FROM public.barriers b WHERE b.created_by = u.id) AS contributions_count
FROM public.users u;

-- 14. Tabela Odkrytych Kafelków Siatki Miejskiej (Gamifikacja & Mgła Wojny)
CREATE TABLE IF NOT EXISTS public.user_discovered_tiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    tile_x INT NOT NULL,
    tile_y INT NOT NULL,
    tile_id TEXT NOT NULL,
    has_photo_contribution BOOLEAN DEFAULT false NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_user_tile UNIQUE (user_id, tile_x, tile_y)
);

CREATE INDEX IF NOT EXISTS idx_user_discovered_tiles_user ON public.user_discovered_tiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_discovered_tiles_tile ON public.user_discovered_tiles(tile_id);
CREATE INDEX IF NOT EXISTS idx_user_discovered_tiles_xy ON public.user_discovered_tiles(tile_x, tile_y);

ALTER TABLE public.user_discovered_tiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Zezwól na odczyt odkrytych kafelków" ON public.user_discovered_tiles;
CREATE POLICY "Zezwól na odczyt odkrytych kafelków" 
ON public.user_discovered_tiles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Zezwól na dodawanie odkrytych kafelków" ON public.user_discovered_tiles;
CREATE POLICY "Zezwól na dodawanie odkrytych kafelków" 
ON public.user_discovered_tiles FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Zezwól na aktualizację kafelków" ON public.user_discovered_tiles;
CREATE POLICY "Zezwól na aktualizację kafelków" 
ON public.user_discovered_tiles FOR UPDATE 
USING (true);

-- Widok Zbiorczych Statystyk Eksploracji Krakowa (Heatmapa & Cel Społeczności)
CREATE OR REPLACE VIEW public.city_exploration_stats AS
SELECT 
    tile_id,
    tile_x,
    tile_y,
    COUNT(DISTINCT user_id) AS explorers_count,
    BOOL_OR(has_photo_contribution) AS is_audited_with_photo,
    MIN(unlocked_at) AS first_unlocked_at
FROM public.user_discovered_tiles
GROUP BY tile_id, tile_x, tile_y;
```