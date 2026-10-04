# ♿ Kraków bez barier – Nawigacja & Crowdsourcing Dostępności

> Prototyp inteligentnego asystenta tras miejskich uwzględniający szczegółowe bariery i udogodnienia architektoniczne dla osób z ograniczeniami ruchowymi i wzrokowymi oraz rodziców z wózkami.

---

## 📌 1. Opis Problemu i Rozwiązania
Standardowe aplikacje nawigacyjne klasyfikują miejsca zero-jedynkowo („dostępne” / „niedostępne”), co nie oddaje realnych potrzeb użytkowników. Trasa z kilkoma niskimi stopniami może być do pokonania dla rodzica z wózkiem dziecięcym, ale nieprzekraczalna dla osoby na wózku elektrycznym.

Aplikacja rozwiązuje ten problem poprzez:
1. **Personalizowaną nawigację pieszą:** Wyszukiwanie tras z precyzyjnym uwzględnieniem schodów, krawężników, nachylenia, rodzaju nawierzchni oraz sygnalizacji dźwiękowej. Realistyczny czas marszu miejskiego (~4.3 km/h dla pieszego, ~3.2 km/h dla wózka + kary czasowe za przeszkody).
2. **Warstwę tekstową dostępności:** Pełny opis trasy w formie tekstowej (dla czytników ekranu osób niewidomych/niedowidzących, zgodnie z WCAG 2.2 AA) z komunikatem `Stan nieznany` dla odcinków bez audytu.
3. **Crowdsourcing i audyt barier:** Moduł angażujący społeczność do fotografowania i opisywania przeszkód (np. liczba schodków, obecność podjazdu, wysokość krawężnika, stan nawierzchni).
4. **Konta użytkowników i bezpieczeństwo:** Konta z hashowaniem haseł `scrypt`, przypisaniem zgłoszeń (`created_by`) oraz narzędziem **Bad Actor Purge** usuwającym złośliwe wpisy i zdjęcia ze Storage.
5. **Transparentność danych:** Każda informacja posiada wskaźnik źródła, datę aktualizacji oraz poziom wiarygodności (zweryfikowane / zgłoszenie społeczności). **Brak danych w bazie nigdy nie jest traktowany jako potwierdzenie dostępności!**

---

## 🏗️ 2. Architektura Systemu

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (Next.js 16 App Router)            │
│  - Leaflet / OpenStreetMap (Wizualizacja przestrzenna)      │
│  - Moduł dostępności WCAG 2.2 AA (Tryb tekstowy / ARIA)     │
│  - Moduł Crowdsourcingu (Upload zdjęć + formularz barier)   │
│  - Moduł Kont Użytkowników & Panel Bad Actor Purge          │
│  - Responsywny layout mobilny (Segmented switcher / Touch)  │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   Routing Engine             │ │ Supabase (Backend as a Svc)│
│ - OpenRouteService / OSRM    │ │ - PostgreSQL + PostGIS     │
│ - Profile: Wózek / Pieszy    │ │ - Tabela users + scrypt    │
│ - Korytarz barier ST_DWithin │ │ - Storage (Bucket barriers)│
└──────────────┬───────────────┘ │ - Procedura RPC Purge      │
               │                 └─────────────▲──────────────┘
               ▼                               │
┌──────────────────────────────────────────────┴──────────────┐
│                  Źródła Danych (Data Pipeline)              │
│ - OpenStreetMap (OSM)                                       │
│ - Otwarte Dane Miasta Krakowa & MSIP                        │
│ - Zgłoszenia użytkowników z autoryzacją (Crowdsourcing)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 3. Tech Stack

* **Frontend:** React 19, Next.js 16 (App Router + Turbopack), TypeScript, Tailwind CSS v4, Lucide Icons.
* **Mapy & Przestrzeń:** Leaflet, OpenStreetMap, PostGIS (WGS84, SRID 4326).
* **Routing:** OpenRouteService API (profil `foot-walking` oraz `wheelchair`) z wbudowanym fallbackiem do OSRM.
* **Backend & Baza Danych:** Supabase (PostgreSQL z rozszerzeniem **PostGIS**, funkcjami RPC i Row Level Security).
* **Bezpieczeństwo & Autoryzacja:** Node.js built-in `scrypt` hashing z 16-bajtową solą, weryfikacja w stałym czasie `timingSafeEqual`, ciasteczka sesyjne `httpOnly`.
* **Przechowywanie plików:** Supabase Storage (dedykowany bucket `barriers` na zdjęcia zgłoszeń).
* **Dostępność cyfrowa:** Standard WCAG 2.2 AA (kontrast min. 4.5:1, semantyczny HTML, pełna obsługa klawiaturą, targety dotykowe min. 44x44px).

---

## 📊 4. Model Danych i Status Wiarygodności

### Tabela `public.barriers`
* `id`: UUID (Primary Key)
* `barrier_type`: `STAIRS`, `HIGH_KERB`, `STEEP_INCLINE`, `COBBLESTONE_SURFACE`, `NARROW_SIDEWALK`, `NO_TACTILE_PAVING`, `ELEVATOR_OUT_OF_ORDER`.
* `location`: `geometry(Point, 4326)` (WGS84) z indeksem GIST.
* `details`: JSONB (np. `{"step_count": 5, "has_ramp": false, "handrail": true}`).
* `source`: `OSM`, `MSIP_KRAKOW`, `CROWDSOURCED`, `OFFICIAL_AUDIT`.
* `status`: `VERIFIED`, `COMMUNITY_CONFIRMED`, `UNVERIFIED`, `DISPUTED`.
* `confidence_score`: float (0.0 - 1.0).
* `last_verified_at`: TIMESTAMPTZ.
* `image_url`: TEXT (adres URL zdjęcia w Supabase Storage).
* `created_by`: UUID (klucz obcy do `public.users.id`).

### Tabela `public.users`
* `id`: UUID (Primary Key)
* `nickname`: TEXT (unikalny nick użytkownika)
* `email`: TEXT (unikalny adres email)
* `password_hash`: TEXT (skrót scrypt z solą)
* `created_at`: TIMESTAMPTZ (data utworzenia)
* `updated_at`: TIMESTAMPTZ
* `is_banned`: BOOLEAN (blokada konta w przypadku naruszeń / spamu)
* `role`: TEXT (`USER` lub `ADMIN`)

### Tabela `public.user_discovered_tiles`
* `id`: UUID (Primary Key)
* `user_id`: UUID (opcjonalny klucz do `public.users.id`)
* `tile_x`: INT (dolne 32-bity bijektywnego indeksu Uber H3 `lower | 0`)
* `tile_y`: INT (górne 32-bity bijektywnego indeksu Uber H3 `upper | 0`)
* `tile_id`: TEXT (15-znakowy indeks komórki Uber H3, np. `891e2e6b153ffff`)
* `has_photo_contribution`: BOOLEAN (flaga zaudytowanego heksagonu ze zdjęciem bariery)
* `unlocked_at`: TIMESTAMPTZ

---

## 📡 5. Zaimplementowane Endpointy API

Aplikacja udostępnia modularne API:

| Metoda | Endpoint | Opis |
|---|---|---|
| `POST` | `/api/route` | Wyznacza trasę pieszą/dla wózków, wylicza korytarz przestrzenny, nakłada przeszkody i oznacza odcinki niezaudytowane (`Stan nieznany`). |
| `POST` | `/api/barriers/along-route` | Wywołuje funkcję PostGIS RPC `get_barriers_along_route` z buforem metrycznym (15–35 m) wokół geometrii trasy. |
| `GET` | `/api/barriers` | Zwraca listę wszystkich aktywnych barier z bazy Supabase (z wykluczeniem wpisów zbanowanych bad actorów). |
| `POST` | `/api/barriers` | Dodaje nową barierę (JSON lub `multipart/form-data` ze zdjęciem do Supabase Storage) i wiąże z `created_by`. |
| `POST` | `/api/auth/register` | Rejestracja nowego użytkownika (`nickname`, `email`, `password`) z bezpiecznym hashem `scrypt`. |
| `POST` | `/api/auth/login` | Logowanie użytkownika, walidacja hasła i ustawienie ciasteczka sesyjnego `kbb_session` (`httpOnly`). |
| `POST` | `/api/auth/logout` | Wylogowanie użytkownika i usunięcie ciasteczka sesyjnego. |
| `GET` | `/api/auth/me` | Zwraca dane zalogowanego użytkownika (nick, email, data rejestracji, liczba zgłoszeń). |
| `GET` | `/api/admin/purge-bad-actor` | Lista użytkowników wraz z liczbą ich zgłoszeń do weryfikacji przez moderatora. |
| `POST` | `/api/admin/purge-bad-actor` | Procedura Bad Actor Purge: blokada konta (`is_banned = true`), usunięcie jego barier z PostGIS i zdjęć ze Storage. |
| `POST` | `/api/discovery/unlock` | Odblokowuje kafelki eksploracji, nalicza punkty XP (+10 XP za kafel, +100 XP za zdjęcie) i zwraca nową rangę. |
| `GET` | `/api/discovery/my-tiles` | Zwraca listę odkrytych kafelków użytkownika, status zdjęć oraz stan poziomu XP. |
| `GET` | `/api/discovery/city-stats` | Zagregowane statystyki społecznościowe (% zbadanego centrum Krakowa, liczba zaudytowanych kafelków). |

---

## 🎮 6. Odkrywanie Mapy Krakowa, Gamifikacja & Wędrówka GPS

W celu aktywizacji społeczności do realnego mapowania barier architektonicznych wdrożono system **odkrywania mapy („Mgła Wojny”)**:

* **Heksagonalna Siatka Uber H3 (Rezolucja 9) & Rozszerzony Obszar Krakowa:**
  * **Globalny standard GIS:** Zastosowanie heksagonalnego systemu H3 od Ubera eliminuje asymetrię przekątnych siatek prostokątnych, zapewniając jednakowy dystans do wszystkich 6 sąsiednich komórek.
  * **Rozszerzony zasięg metropolitalny (~83 km²):** Obejmuje Stare Miasto, Kazimierz, Podgórze, Krowodrzę, Błonia, Dębniki, Grzegórzki, Dąbie, Czyżyny, Zabłocie i Tauron Arenę (`50.0300° N – 50.0950° N`, `19.8950° E – 20.0300° E`).
  * **697 heksagonalnych kafelków:** Średnica heksagonu $\approx 350-400\,\text{m}$ (krawędź $\approx 200\,\text{m}$, powierzchnia $\approx 0.1\,\text{km}^2$). Odpowiada to idealnemu miejskiemu dystansowi spacerowemu (~4-6 min) i renderuje się w Leaflet w czasie poniżej 3 ms.
  * **Bijective Storage:** 15-znakowe identyfikatory heksagonów H3 (np. `891e2e6b153ffff`) są mapowane na dwuelementowy wektor 32-bitowych liczb całkowitych (`tile_x`, `tile_y`) dzięki funkcji `h3IndexToSplitLong`, zachowując pełną kompatybilność z bazą PostgreSQL.
* **Ochrona Prywatności (Privacy by Design):**
  * W bazie **nie są zapisywane** surowe koordynaty ani ślady GPS użytkowników. Serwer przechowuje jedynie unikalne identyfikatory zaliczonych heksagonów.
* **Mechanizm Wizualny Mgły Wojny (Fog of War):**
  * **Heksagony nieodkryte są widoczne:** Tworzą estetyczną, półprzezroczystą heksagonalną mgłę (`fillOpacity: 0.22`, `fillColor: #475569`) z subtelną obramówką (`opacity: 0.25`), nie zasłaniając nazw ulic pod spodem.
  * **Heksagony odkryte znikają:** Po przebyciu sektora (trasą lub GPS) mgła rozwiewa się, odsłaniając czystą mapę miasta.
* **Punktacja XP i Odznaki:**
  * **+10 XP** za odkrycie heksagonu i rozproszenie mgły,
  * **+50 XP** za zgłoszenie bariery architektonicznej,
  * **+100 XP** za zgłoszenie bariery **ze zdjęciem** (kluczowy dowód audytu ze znacznikiem na mapie).
* **Dwa Tryby Eksploracji (Przełącznik w profilu użytkownika):**
  1. **Tryb Planera (Domyślny, toggle OFF):** Heksagony odblokowują się automatycznie wzdłuż wyznaczanych tras miejskich A $\to$ B.
  2. **Tryb Wędrówki na żywo (Toggle ON, GPS):**
     * Kafelki nie są odkrywane w planerze – użytkownik musi włączyć GPS i fizycznie wejść w dany sektor heksagonalny.
     * **Auto-centrowanie mapy:** Po włączeniu trybu mapa automatycznie przełącza się na widok smartfona i płynnie centruje widok na aktualnej lokalizacji użytkownika (zoom 16).
     * **Wskaźnik GPS:** Pulsujący niebieski marker na mapie oraz pływający przycisk *„Moja lokalizacja”* umożliwiający ponowne wyśrodkowanie w dowolnej chwili.
     * **Dynamiczne powiadomienia:** W czasie rzeczywistym pojawia się powiadomienie `✨ Odkryto kafel: X (+10 XP)!`.

---

## 🛡️ 7. Funkcja Bad Actor Purge & Ochrona Danych

W celu ochrony platformy crowdsourcingowej przed spamem i wandalizmem wdrożono kompleksowy system oczyszczania:
1. **Procedura bazodanowa RPC:** `purge_bad_actor_contributions(target_user_id UUID)` (PostgreSQL `SECURITY DEFINER`) – blokuje konto i usuwa rekordy barier.
2. **Czyszczenie Supabase Storage:** Backend identyfikuje wszystkie pliki graficzne wgrane przez spamera i usuwa je bezpośrednio z bucketa `barriers`.
3. **Interfejs Moderatora:** Przycisk *Purge tool* w nagłówku otwiera okno modalne z listą użytkowników i możliwością uruchomienia procedury jednym kliknięciem.
4. **Blokada logowania:** Zablokowany użytkownik otrzymuje status 401 przy próbie logowania (`Konto zablokowane ze względów bezpieczeństwa`).

---

## 📱 8. Responsywność Mobilna & Galeria Zdjęć

* **Przełącznik mobilny:** Na ekranach smartfonów (`< lg`) dostępny jest szybki przełącznik segmentowy `[Planer i Wskazówki] | [Mapa]`, eliminujący uciążliwe przewijanie.
* **Targety dotykowe:** Wszystkie przyciski i pola spełniają standard WCAG 2.2 Target Size (min. 44x44px).
* **Galeria zdjęć:** Komponent `BarrierImageGallery` oferuje płynne przełączanie zdjęć (lewo/prawo), wybór trybu dopasowania obrazu (`Dopasuj całość` / `Wypełnij`) oraz pełnoekranowy lightbox z obsługą klawiatury (`Esc`, strzałki).

---

## 🚀 9. Uruchomienie Lokalne

### Wymagania wstępne
* Node.js v20+
* Konto w [Supabase](https://supabase.com) z włączonym rozszerzeniem PostGIS.

### Instalacja
1. Sklonuj repozytorium:
   ```bash
   git clone https://github.com/twoj-zespol/krakow-bez-barier.git
   cd krakow-bez-barier
   ```
2. Zainstaluj zależności:
   ```bash
   npm install
   ```
3. Skonfiguruj zmienne środowiskowe (`.env.local`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj-klucz-anon
   # Opcjonalne:
   SUPABASE_SERVICE_ROLE_KEY=twoj-service-role-key
   NEXT_PUBLIC_ORS_API_KEY=twoj-klucz-openrouteservice
   AUTH_SECRET=super-bezpieczny-klucz-sesji
   ```
4. Uruchom bazę danych w Supabase:
   * Skopiuj kod z pliku `supabase/migrations/20261003_create_users_and_bad_actor_purge.sql` oraz `supabase/migrations/20261004_create_discovered_tiles.sql` i wykonaj w **SQL Editor**.
5. Uruchom serwer deweloperski:
   ```bash
   npm run dev
   ```
   Aplikacja dostępna pod adresem: `http://localhost:3000`.

## 🔄 10. Testy & Automatyzacja CI/CD (GitHub Actions)

Projekt wyposażono w pełny pakiet testów jednostkowych oraz zautomatyzowany proces Continuous Integration:

* **Runner testowy:** **Vitest** zintegrowany z Next.js App Router i TypeScript (czas wykonania całego pakietu: ~500 ms).
* **23 testy jednostkowe:**
  * `tests/grid.test.ts` – algorytm indeksowania przestrzennego Uber H3 (rozdzielczość 9), wyznaczanie wielokątów heksagonów, bijektywny roundtrip `parseTileId`, próbkowanie tras i mechanika poziomów/XP.
  * `tests/routing.test.ts` – odległości Haversine, prędkości marszu dla profili (wózek inwalidzki, dziecięcy, pieszy), realistyczne kary czasowe za przeszkody architektoniczne.
  * `tests/barriers.test.ts` – parsowanie geometrii PostGIS (GeoJSON Point, WKT, invalid), sanitizacja i normalizacja obiektów wg standardu WCAG/AGENTS.md.
* **Dostępne komendy CLI:**
  ```bash
  npm test           # Uruchomienie pełnego pakietu 23 testów
  npm run test:watch # Tryb ciągłego testowania z hot-reloadem (TDD)
  npm run lint       # Analiza statyczna kodu ESLint
  npm run build      # Produkcyjna kompilacja i kontrola typów
  ```
* **Pipeline GitHub Actions (`.github/workflows/ci.yml`):**
  * Uruchamiany automatycznie przy każdym pushu i pull requeście (`main`, `feat/*`, `refactor/*`).
  * Wykonuje sekwencję: instalacja czysta (`npm ci`), linter (`npm run lint`), testy jednostkowe (`npm test`) oraz build produkcyjny (`npm run build`).
* **Scenariusze testów manualnych:**
  * Szczegółowy przewodnik po wszystkich scenariuszach funkcjonalnych (UI oraz API cURL) znajduje się w dokumencie `TESTING.md`.

---

## ♿ 11. Dostępność Cyfrowa (WCAG 2.2 AA)
* **Alternatywa dla mapy:** Dedykowany widok listy kroków („Krok po kroku”) z pełnym opisem przeszkód (np. *„Za 50 m: 4 stopnie w dół, brak podjazdu, nawierzchnia z kostki brukowej”*).
* **Skróty klawiszowe:** Klawisz `Tab` przenosi logicznie przez wszystkie elementy aktywne, `Escape` zamyka modale, strzałki obsługują galerię.
* **Tryb wysokiego kontrastu:** Wsparcie dla preferencji systemowych oraz kontrast tekstu min. 4.5:1.
* **Dynamiczne komunikaty:** Atrybuty `aria-live="polite"` dla wyników wyszukiwania, komunikatów trasy i błędów.

---

## 💼 12. Model Biznesowy i Skalowalność
* **B2G (Samorządy):** Narzędzie gotowe do wdrożenia w dowolnym mieście dzięki integracji ze standardem OpenStreetMap i PostGIS.
* **B2B (Hotele, Gastronomia, Wydarzenia):** Widget do umieszczenia na stronach obiektów prezentujący dokładny profil dostępności dla gości o szczególnych potrzebach.
* **Audyty Dostępności:** Narzędzie ułatwiające inwentaryzację barier i generowanie raportów do celów certyfikacji dostępności budynków.