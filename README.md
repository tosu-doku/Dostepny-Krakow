# ♿ Kraków bez barier – Nawigacja & Crowdsourcing Dostępności

> Prototyp inteligentnego asystenta tras miejskich uwzględniający szczegółowe bariery i udogodnienia architektoniczne dla osób z ograniczeniami ruchowymi i wzrokowymi oraz rodziców z wózkami.

---

## 📌 1. Opis Problemu i Rozwiązania
Standardowe aplikacje nawigacyjne klasyfikują miejsca zero-jedynkowo („dostępne” / „niedostępne”), co nie oddaje realnych potrzeb użytkowników. Trasa z trzema niskimi stopniami może być do pokonania dla rodzica z wózkiem dziecięcym, ale nieprzekraczalna dla osoby na wózku elektrycznym.

Aplikacja rozwiązuje ten problem poprzez:
1. **Personalizowaną nawigację pieszą:** Wyszukiwanie tras z precyzyjnym uwzględnieniem schodów, krawężników, nachylenia, rodzaju nawierzchni oraz sygnalizacji dźwiękowej.
2. **Warstwę tekstową dostępności:** Pełny opis trasy w formie tekstowej (dla czytników ekranu osób niewidomych/niedowidzących, zgodnie z WCAG 2.2 AA).
3. **Crowdsourcing i audyt barier:** Moduł angażujący społeczność do fotografowania i opisywania przeszkód (np. liczba schodków, obecność podjazdu, stan nawierzchni).
4. **Transparentność danych:** Każda informacja posiada wskaźnik źródła, datę aktualizacji oraz poziom wiarygodności (zweryfikowane / zgłoszenie społeczności). **Brak danych nigdy nie jest traktowany jako potwierdzenie dostępności!**

---

## 🏗️ 2. Architektura Systemu

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (React PWA / Next.js)              │
│  - MapLibre GL / Leaflet (Wizualizacja)                     │
│  - Moduł dostępności WCAG 2.2 AA (Tryb tekstowy / ARIA)     │
│  - Moduł Crowdsourcingu (Aparat PWA + formularz barier)     │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   Routing Engine             │ │ Supabase (Backend as a Svc)│
│ - OpenRouteService / Valhalla│ │ - PostgreSQL + PostGIS     │
│ - Profile: Wheelchair / Blind│ │ - Storage (Zdjęcia barier) │
└──────────────┬───────────────┘ │ - Walidacja wiarygodności  │
               │                 └─────────────▲──────────────┘
               ▼                               │
┌──────────────────────────────────────────────┴──────────────┐
│                  Źródła Danych (Data Pipeline)              │
│ - OpenStreetMap (OSM Overpass API)                          │
│ - Otwarte Dane Miasta Krakowa & MSIP                        │
│ - Zgłoszenia użytkowników (Crowdsourcing)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 3. Tech Stack

* **Frontend:** React 19 / Next.js 15, TypeScript, Tailwind CSS, Radix UI (gwarancja dostępności klawiatury i czytników).
* **Mapy & Przestrzeń:** OpenStreetMap, MapLibre GL JS, Leaflet.
* **Routing:** OpenRouteService API (profil `foot-walking` oraz `wheelchair`).
* **Backend & Baza:** Supabase (PostgreSQL z rozszerzeniem **PostGIS** do obliczeń przestrzennych).
* **Przechowywanie plików:** Supabase Storage (optymalizacja i hosting zdjęć przeszkód).
* **Dostępność cyfrowa:** Standard WCAG 2.2 AA (kontrast min. 4.5:1, semantyczny HTML, pełna obsługa bez myszy).

---

## 📊 4. Model Danych i Status Wiarygodności

Każda przeszkoda i segment trasy opisany jest metadanymi wiarygodności:
* `source`: `OSM`, `MSIP_KRAKOW`, `CROWDSOURCED`, `OFFICIAL_AUDIT`.
* `verification_status`:
  * 🟢 `VERIFIED` – potwierdzone przez miasto lub audytora.
  * 🟡 `COMMUNITY_CONFIRMED` – zgłoszone przez użytkownika i potwierdzone min. 2 zdjęciami/innymi użytkownikami.
  * ⚪ `UNVERIFIED` – pojedyncze zgłoszenie użytkownika (wymaga ostrożności).
  * 🔴 `UNKNOWN` – brak danych w rejestrach (wyraźne ostrzeżenie dla użytkownika).

---

## 📡 5. Zaimplementowane Endpointy API

Aplikacja udostępnia modularne API zgodne z architekturą z `AGENTS.md`:

| Metoda | Endpoint | Opis |
|---|---|---|
| `POST` | `/api/route` | Wyznacza trasę pieszą/dla wózków, wylicza korytarz przestrzenny, nakłada przeszkody i oznacza odcinki niezaudytowane (`Stan nieznany (brak audytu)`). |
| `POST` | `/api/barriers/along-route` | Wywołuje funkcję PostGIS RPC `get_barriers_along_route` z buforem metrycznym (np. 15–20 m) wokół przekazanej geometrii trasy. |
| `GET` | `/api/barriers` | Zwraca listę wszystkich barier z bazy Supabase wraz ze współrzędnymi WGS84 i metadanymi wiarygodności. |
| `POST` | `/api/barriers` | Dodaje nową barierę (JSON lub `multipart/form-data` ze zdjęciem wysyłanym do Supabase Storage). |

---

## 🚀 6. Uruchomienie Lokalne

### Wymagania wstępne
* Node.js v20+
* Konto i projekt w [Supabase](https://supabase.com) z włączonym rozszerzeniem PostGIS.

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
   NEXT_PUBLIC_SUPABASE_URL=twoj_projekt_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj_klucz_anonimowy
   NEXT_PUBLIC_ORS_API_KEY=klucz_openrouteservice
   ```
4. Uruchom bazę danych (skrypty migracji SQL znajdują się w `DATA_MODEL.md`).
5. Uruchom serwer deweloperski:
   ```bash
   npm run dev
   ```
   Aplikacja dostępna pod adresem: `http://localhost:3000`.

---

## ♿ 7. Dostępność Cyfrowa (WCAG 2.2 AA)
* **Alternatywa dla mapy:** Dedykowany widok listy kroków („Krok po kroku”) z pełnym opisem przeszkód (np. *„Za 50 m: 4 stopnie w dół, brak podjazdu, nawierzchnia z kostki brukowej”*).
* **Skróty klawiszowe:** Klawisz `Tab` przenosi logicznie przez wszystkie elementy aktywne.
* **Tryb wysokiego kontrastu:** Wsparcie dla preferencji systemowych (`prefers-contrast`).

---

## 💼 8. Model Biznesowy i Skalowalność
* **B2G (Samorządy):** Narzędzie gotowe do wdrożenia w dowolnym mieście dzięki integracji ze standardem OpenStreetMap.
* **B2B (Hotele, Gastronomia, Wydarzenia):** Widget do umieszczenia na stronach hoteli i obiektów kulturalnych prezentujący dokładny profil dojazdu i wejścia dla gości o szczególnych potrzebach.
* **Audyty Dostępności:** Narzędzie generujące raporty dla zarządców nieruchomości do celów certyfikacji dostępności budynków.