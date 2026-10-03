-- ==============================================================================
-- Migracja: 20261004_create_discovered_tiles.sql
-- Projekt: „Kraków bez barier” (HackYeah 2026)
-- Opis: Tabela odkrytych kafelków siatki miejskiej (~100m x 100m) dla gamifikacji,
--       mechanizmu mgły wojny (Fog of War) oraz stymulacji audytu fotograficznego.
-- ==============================================================================

-- 1. Tabela Odkrytych Kafelków (public.user_discovered_tiles)
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

-- Indeksy dla natychmiastowego odczytu kafelków danego użytkownika i kafelka w mieście
CREATE INDEX IF NOT EXISTS idx_user_discovered_tiles_user ON public.user_discovered_tiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_discovered_tiles_tile ON public.user_discovered_tiles(tile_id);
CREATE INDEX IF NOT EXISTS idx_user_discovered_tiles_xy ON public.user_discovered_tiles(tile_x, tile_y);

-- 2. Row Level Security (RLS)
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

-- 3. Widok Zbiorczych Statystyk Eksploracji Krakowa (Heatmapa & Cel Społeczności)
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
