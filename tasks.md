# Lista Zadań (tasks.md)

- [x] **Zadanie 1: Obsługa kliknięć na mapie i wybieranie własnych współrzędnych trasy**
  - Wyeliminowano niepożądane przełączanie na zakładkę "Zgłoś barierę", gdy użytkownik znajduje się na widoku trasy.
  - Dodano interaktywny wybór punktu Startowego (A) oraz Docelowego (B) bezpośrednio na mapie za pomocą przycisków "Wskaż na mapie" oraz bezpośredniej edycji współrzędnych.

- [x] **Zadanie 2: Korekta szacowanego czasu przejścia trasy (czas pieszy/wózek)**
  - Wdrożono funkcję `calculateRealisticDurationSeconds` w `services/routing.ts` z realistycznymi prędkościami marszu miejskiego (~4.3 km/h dla pieszego, ~3.2–3.5 km/h dla wózka) oraz karami czasowymi za przeszkody (schody, wysokie krawężniki).
  - Czas dla trasy np. 1.25 km wzrósł z nierealistycznych 3 minut do realnych ~23–25 minut.

- [x] **Zadanie 3: Usunięcie frazy "(brak audytu)" przy powiadomieniach o stanie nieznanym**
  - Wszystkie etykiety, ostrzeżenia i znaczniki kroków wyświetlają teraz zwięzłą informację `Stan nieznany`.

- [x] **Zadanie 4: Usunięcie dopisku "(Supabase Storage)" z formularza dodawania zdjęcia**
  - Zaktualizowano etykietę w `AddBarrierForm.tsx` na `Zdjęcie przeszkody (opcjonalnie):`.

- [x] **Zadanie 5: Prosta przeglądarka zdjęć (karuzela lewo/prawo) + weryfikacja dokładnych zdjęć Unsplash**
  - Zweryfikowano i pobrano dokładne bezpośrednie linki CDN dla ID `q9WliWyTT4A` (Guillaume QL - schody drewniane) oraz `_bA6ZZTuzgU` (An Shved - schody omszałe). Poprzednio podmieniono je na generyczny las mglisty – obecnie w bazie i w widoku znajdują się w 100% dokładne zdjęcia schodów.
  - Zaktualizowano komponent `BarrierImageGallery.tsx`:
    - Zwiększono wysokość (`h-64 sm:h-72`), zastosowano `object-contain` z estetycznym rozmytym tłem (brak obcinania góry/dołu stopni i brak czarnych dziur).
    - Dodano przycisk przełączania trybu dopasowania ("Dopasuj całość" / "Wypełnij").
    - Dodano modal pełnoekranowy (lightbox) z obsługą klawiatury (`Escape`, strzałki `◀` `▶`).
  - Zaktualizowano i zdeduplikowano wpis w Supabase: *Park Bednarskiego - Leśne schody (stopnie drewniane i kamienne)*.

- [x] **Zadanie 6: Rozwiązanie błędu Leaflet `Cannot read properties of undefined (reading '_leaflet_pos')`**
  - W `AccessibleMap.tsx` wprowadzono bezpieczne zarządzanie warstwami przez `L.layerGroup` zamiast ręcznego usuwania i mutacji pojedynczych markerów.
  - Wyłączono animację w `fitBounds` (`animate: false`), eliminując wyścigi animacji Leafleta podczas aktualizacji współrzędnych.

- [x] **Zadanie 7: Responsywność na urządzenia mobilne (Mobile UI/UX)**
  - Wdrożono mobilny przełącznik widoku na smartfonach (`< lg`): przełączanie jednym tapnięciem między *„Planer i Wskazówki”* a *„Interaktywna Mapa”*, eliminując uciążliwe przewijanie i przechwytywanie gestów przez Leaflet.
  - Dostosowano targety dotykowe min. 44x44px (zgodnie z WCAG 2.2 Target Size) dla przycisków, pól formularzy i selektora profili (`grid-cols-1 sm:grid-cols-2`).
  - Zapewniono automatyczne przełączanie na mapę po kliknięciu *„Wskaż na mapie”* oraz przycisk szybkiego powrotu do wskazówek trasy.
  - Zoptymalizowano nagłówek i formularz zgłaszania przeszkód dla małych ekranów smartfonów.

- [x] **Zadanie 8: Podstawowe konto użytkownika, bezpieczeństwo bazy i Bad Actor Purge**
  - **Model Użytkownika:** tabela `public.users` z polami: `id UUID`, `nickname TEXT UNIQUE`, `email TEXT UNIQUE`, `password_hash TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`, `is_banned BOOLEAN`, `role TEXT`.
  - **Bezpieczeństwo Haseł i Sesji:** kryptograficzne hashowanie haseł algorytmem `scrypt` z losową solą 16-bajtową (`node:crypto`), weryfikacja w stałym czasie `timingSafeEqual`, bezpieczne tokeny sesyjne w ciasteczkach `httpOnly`.
  - **Przypisanie Zgłoszeń i Zdjęć:** zgłoszenia z formularza crowdsourcingu automatycznie wiążą się z zalogowanym użytkownikiem (`created_by`), informując o statusie w formularzu.
  - **Bad Actor Purge:** wdrożono procedurę PostgreSQL RPC `purge_bad_actor_contributions(target_user_id UUID)` ze statusem `SECURITY DEFINER` oraz endpoint `/api/admin/purge-bad-actor` i modal UI, które:
    - natychmiastowo blokują konto spamera (`is_banned = true`),
    - usuwają wszystkie zgłoszone przez niego bariery z bazy PostGIS,
    - usuwają wgrane przez niego zdjęcia bezpośrednio z bucketa Supabase Storage (`barriers`).
  - **Dokumentacja i Migracja SQL:** przygotowano plik migracji `supabase/migrations/20261003_create_users_and_bad_actor_purge.sql` oraz zaktualizowano `DATA_MODEL.md` (sekcje 9–13) z gotowym do uruchomienia kodem SQL.

