# AGENTS.md – Instrukcje dla Agenta / Asystenta Programistycznego

## Cel Projektu
Budujemy aplikację dla hackathonu „Kraków bez barier”. Rozwiązanie musi wspierać osoby z ograniczeniami wzroku i ruchu w nawigacji miejskiej oraz zbierać ustrukturyzowane dane o barierach architektonicznych metodą crowdsourcingu.

---

## Główne Zasady Implementacji (Nie łamać!)

### 1. Dostępność (WCAG 2.2 AA to priorytet)
* Każda informacja prezentowana na mapie **musi mieć bezpośredni ekwiwalent tekstowy** w drzewie DOM (`aria-live="polite"` dla komunikatów dynamicznych).
* Wszystkie przyciski, formularze i modale muszą być w 100% obsługiwane klawiaturą (`Tab`, `Enter`, `Escape`).
* Do komponentów UI używaj `@radix-ui` lub czystego HTML z prawidłowymi znacznikami ARIA.
* Kontrast tekstu do tła nie może być mniejszy niż 4.5:1.

### 2. Obsługa Danych i Braków Informacji (Zasada Rzetelności)
* **NIGDY nie traktuj braku danych w bazie jako faktu, że przeszkody nie ma.** Jeśli trasa nie ma danych o krawężnikach/schodach, oznacz segment jako: `Stan nieznany (brak audytu)`.
* Każdy obiekt bariery (`Barrier`) w kodzie musi posiadać pola:
  * `source`: identyfikator źródła,
  * `last_verified_at`: data ostatniej weryfikacji,
  * `confidence_score`: ocena wiarygodności (0.0 - 1.0).

### 3. Architektura Kodu
* **Frontend:** Next.js (App Router) + Tailwind CSS + Lucide Icons.
* **Stan:** Zagregowany stan nawigacji i filtrów barier (Zustand lub React Context).
* **Separacja logiki:** Logika pobierania tras (`services/routing.ts`) jest odseparowana od komponentów renderujących mapę (`components/map/`).

---

## Scenariusze do Zaimplementowania w pierwszej kolejności
1. **Widok Nawigacji:**
   * Wybór profilu: Wózek inwalidzki / Wózek dziecięcy / Osoba niedowidząca.
   * Wyszukanie trasy A -> B z wywołaniem OpenRouteService.
   * Nałożenie na trasę punktów POI z barierami pobranymi z PostGIS (`/api/barriers/along-route`).
   * Panel boczny z listą przeszkód w kolejności ich występowania na trasie.
2. **Formularz Crowdsourcingu:**
   * Kliknięcie na mapie lub geolokalizacja `Dodaj barierę`.
   * Typ: `Schody` -> pola: liczba stopni, podjazd (tak/nie), poręcz (tak/nie), zdjęcie.
   * Wysyłka zdjęcia do Supabase Storage + wpis w tabeli `barriers`.