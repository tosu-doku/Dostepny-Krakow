-- ==============================================================================
-- Migracja: 20261003_create_users_and_bad_actor_purge.sql
-- Projekt: „Kraków bez barier” (HackYeah 2026)
-- Opis: Tabela użytkowników z bezpiecznym hashem hasła, powiązanie ze zgłoszeniami
--       i zdjęciami (created_by) oraz funkcja usuwania bad actora (Purge).
-- ==============================================================================

-- 1. Tabela Użytkowników (public.users)
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

-- Indeksy dla szybkiego wyszukiwania użytkownika po emailu i nicku
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON public.users(nickname);

-- 2. Zapewnienie kolumny created_by oraz klucza obcego w tabeli barriers
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

-- Utworzenie klucza obcego do public.users (jeśli jeszcze nie istnieje)
DO $$
BEGIN
    -- [POPRAWKA] Wyczyszczenie osieroconych referencji przed nałożeniem klucza
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

-- Indeks na created_by dla błyskawicznego filtrowania i usuwania naruszeń
CREATE INDEX IF NOT EXISTS idx_barriers_created_by ON public.barriers(created_by);

-- Polityka usuwania barier (dla procedury czyszczenia Bad Actora)
DROP POLICY IF EXISTS "Zezwól na usuwanie barier" ON public.barriers;
CREATE POLICY "Zezwól na usuwanie barier" 
ON public.barriers FOR DELETE 
USING (true);

-- 3. Row Level Security (RLS) dla tabeli users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Polityki dostępu
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

-- 4. Funkcja RPC: Usuwanie naruszeń bad actora (Bad Actor Purge)
-- Blokuje konto użytkownika (is_banned = true), usuwa wszystkie jego wpisy z tabeli barriers
-- i zwraca listę adresów zdjęć, aby backend mógł je usunąć z Supabase Storage.
CREATE OR REPLACE FUNCTION public.purge_bad_actor_contributions(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    purged_barriers INT := 0;
    deleted_image_urls TEXT[];
    user_record public.users%ROWTYPE;
BEGIN
    -- Weryfikacja istnienia użytkownika
    SELECT * INTO user_record FROM public.users WHERE id = target_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Użytkownik o podanym ID nie istnieje'
        );
    END IF;

    -- 1. Zablokowanie konta (ban)
    UPDATE public.users 
    SET is_banned = true, updated_at = now() 
    WHERE id = target_user_id;

    -- 2. Zebranie adresów URL zdjęć wgranych przez tego użytkownika
    SELECT COALESCE(ARRAY_AGG(image_url), ARRAY[]::TEXT[]) INTO deleted_image_urls
    FROM public.barriers
    WHERE created_by = target_user_id AND image_url IS NOT NULL;

    -- 3. Usunięcie wszystkich zgłoszonych barier powiązanych z tym użytkownikiem
    WITH deleted_rows AS (
        DELETE FROM public.barriers
        WHERE created_by = target_user_id
        RETURNING id
    )
    SELECT COUNT(*) INTO purged_barriers FROM deleted_rows;

    -- 4. Zwrócenie ustrukturyzowanego raportu do backendu
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

-- 5. Bezpieczny widok publicznych profili bez ujawniania hashy haseł
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
    u.id,
    u.nickname,
    u.created_at,
    u.is_banned,
    (SELECT COUNT(*) FROM public.barriers b WHERE b.created_by = u.id) AS contributions_count
FROM public.users u;
