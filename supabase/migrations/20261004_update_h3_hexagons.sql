-- ==============================================================================
-- Migracja: 20261004_update_h3_hexagons.sql
-- Projekt: „Kraków bez barier” (HackYeah 2026)
-- Opis: Wdrożenie wsparcia dla globalnej siatki heksagonalnej Uber H3 (Rezolucja 9)
--       oraz rozszerzonego obszaru operacyjnego Krakowa (~83 km² / 697 heksagonów).
-- ==============================================================================

-- 1. Upewnienie się, że tabela obsługuje unikalne kafelki H3 per użytkownik
-- W H3 każdy kafelek identyfikowany jest przez 15-znakowy ciąg heksadecymalny (np. '891e2e6b153ffff').
-- Kolumny tile_x i tile_y przechowują wzajemnie jednoznaczny podział na dwie 32-bitowe liczby całkowite
-- (h3IndexToSplitLong), co zachowuje pełną kompatybilność wsteczną z tabelą public.user_discovered_tiles.

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_discovered_tiles_user_h3 
ON public.user_discovered_tiles (user_id, tile_id);

-- 2. Aktualizacja widoku statystyk miejskich z uwzględnieniem identyfikatorów H3
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

COMMENT ON VIEW public.city_exploration_stats IS 'Zagregowane statystyki odkryć heksagonów H3 w Krakowie dla celów heatmapy i zaangażowania społeczności';
