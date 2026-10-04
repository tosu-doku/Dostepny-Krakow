# 📱 Dokumentacja Refaktoringu UI – Mobile Portrait & Design System

> Dedykowana dokumentacja przebudowy interfejsu użytkownika aplikacji **„Kraków bez barier”** na branchu `feat/mobile-ui-refactor`. Dokument opisuje założenia architektoniczne, wdrożony system designu (Design Tokens), realizację makiet z załączników oraz aktualny stan i postęp prac.

---

## 🎯 1. Główne Założenia Refaktoringu

Celem refaktoringu jest przekształcenie hackathonowego interfejsu desktopowo-responsywnego w dedykowane, nowoczesne doświadczenie **Mobile-First w układzie pionowym (Portrait)**, odpowiadające realnemu użytkowaniu nawigacji pieszej na smartfonach na ulicach Krakowa.

### Kluczowe decyzje projektowe:
1. **Układ Mobile Portrait (360px – 430px):**
   - Interfejs zoptymalizowany pod jedną rękę i orientację pionową.
   - Na urządzeniach desktopowych interfejs prezentowany jest jako elegancka, wycentrowana ramka smartfona (`max-w-md mx-auto min-h-screen`), eliminując rozciąganie elementów na szerokich monitorach.
2. **Wyłącznie Jasny Motyw (Strict Light Theme):**
   - Całkowite usunięcie media queries ciemnego motywu (`@media (prefers-color-scheme: dark)`).
   - Zapewnienie maksymalnej czytelności w pełnym słońcu na zewnątrz.
   - Rygorystyczny kontrast tekstu i kontrolek do tła (zgodność z **WCAG 2.2 AA** – współczynnik kontrastu $\ge 4.5:1$).
3. **Nowoczesna Typografia i Design Tokens:**
   - Krój pisma **Plus Jakarta Sans** (Google Fonts) w wagach 400, 500, 600, 700 i 800 z pełną obsługą polskich znaków diakrytycznych (`latin-ext`).
   - Centralizacja stałych kolorów, promieni zaokrągleń i cieni w `src/constants/theme.ts`.
4. **Nawigacja w Stylu Aplikacji Mobilnej:**
   - 5-elementowy dolny pasek nawigacyjny (`BottomNavigation`): *Mapa*, *Trasa*, *Liga*, *Dodaj*, *Profil*.
   - Pływające panele i wysuwany arkusz dolny (*Bottom Sheet*) niezasłaniające kluczowych elementów mapy.

---

## 🎨 2. System Designu & Tokeny Wizualne (`src/constants/theme.ts`)

Wszystkie stałe wizualne zostały wyekstrahowane do spójnego modułu konfiguracyjnego:

```typescript
export const THEME_COLORS = {
  // Barwy główne
  primary: '#7c3aed',       // Fiolet akcentowy
  primaryLight: '#ede9fe',  // Jasny fiolet tła akcentu
  primaryDark: '#5b21b6',   // Ciemny fiolet
  
  // Akcenty akcji & CTA
  ctaMagenta: '#d90479',    // Wyrazista magenta dla głównych CTA (wg załącznika 1)
  ctaMagentaHover: '#b50364',
  plumHeader: '#4c0519',    // Głęboka śliwka/burgund nagłówka (wg załącznika 3)
  
  // Trasa & Grywalizacja H3
  routeHexGreen: '#34d399',      // Jasnozielone heksagony trasy (wg załącznika 1)
  routeHexGreenBorder: '#059669',
  fogOfWarHex: '#475569',        // Neutralna mgła wojny poza trasą
  
  // Tła & Powierzchnie
  background: '#ffffff',
  surfaceLight: '#f8fafc',
  surfaceMuted: '#f1f5f9',
  
  // Tekst i typografia
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  
  // Statusy i bezpieczeństwo
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};
```

### Typografia:
* **Czcionka bazowa:** `Plus Jakarta Sans`, sans-serif.
* **Skala:** `xs` (11px), `sm` (13px), `base` (15px), `lg` (18px), `xl` (20px), `2xl` (24px).
* **Zaokrąglenia:** `rounded-2xl` (16px) dla kart i modali, `rounded-full` (9999px) dla pigułek wyszukiwania i przycisków akcji.

---

## 🗺️ 3. Realizacja Wymagań z Załączników

### Załącznik 1: Wizualizacja Trasy na Mapie & Heksagony H3
* **Jasnozielone heksagony korytarza trasy:**
  * W [`src/components/map/AccessibleMap.tsx`](file:///home/bigguy/Desktop/projekty-kola-itp/hackyeah%202026/src/components/map/AccessibleMap.tsx) funkcja sprawdzająca `routeHexIds.has(tile.id)` w trybie wędrówki na żywo barwi heksagony trasy na kolor `#34d399` (obrys `#059669`), informując użytkownika o zaliczanych sektorach.
  * Heksagony mgły wojny poza trasą pozostają neutralne grafitowe (`#475569`).
* **Pigułki barier i udogodnień (`createBarrierPillIcon`):**
  * Pigułki ostrzegawcze i ułatwienia (`✓ Podjazd`, `⚠️ Krawężnik 4 cm`, `⚠️ 4 stopnie`) pojawiają się **wyłącznie na wyznaczonej trasie po jej skalkulowaniu**, nie zaśmiecając mapy podczas swobodnego przeglądania.
  * Zamiast zwykłych kropek, na trasie renderowane są czytelne pigułki tekstowe z podwyższonym kontrastem.
* **Pływające przyciski szybkiej akcji:**
  * Pływający przycisk ze zdjęciem i aparatem: `Dodaj zdjęcie / Przejmij sektor (+25 XP)`.
  * Akcentowany przycisk CTA `Apply` zamykający filtry i aplikujący zmiany.
* **Dostępne Kontrolki Mapy (Zoom & Lokalizacja GPS):**
  * Usunięto domyślne, małe kontrolki Leaflet z lewego górnego rogu (`topleft`), które były zasłaniane przez banery wyszukiwania i trasy.
  * Zaimplementowano nowoczesne kontrolki przybliżania/oddalania (`+` / `-`) oraz centrowania GPS po **prawej stronie w pionowym środku ekranu** (`right-3 top-1/2 -translate-y-1/2`).
  * Spełniają normę **WCAG 2.2 AA (Target Size 44x44px)**, są wygodne w obsłudze kciukiem jednej ręki na smartfonie i w 100% dostępne z klawiatury (`focus:ring-2`, `aria-label`).

---

### Załącznik 2: Nawigacja Krok po Kroku (Turn-by-Turn) & Arkusz Trasy
* **Górny ciemny baner manewru ([`src/components/navigation/TurnBanner.tsx`](file:///home/bigguy/Desktop/projekty-kola-itp/hackyeah%202026/src/components/navigation/TurnBanner.tsx)):**
  * Kontrastowy, grafitowy panel (`bg-slate-900/95`) z żółtą ikoną skrętu w prawo/lewo.
  * Czytelny dystans do manewru (np. `Za 50 metrów`) i nazwa ulicy docelowej (np. `Skręć w prawo w Floriańską`).
* **Pływające karty statystyk trasy ([`src/components/navigation/RouteStatCards.tsx`](file:///home/bigguy/Desktop/projekty-kola-itp/hackyeah%202026/src/components/navigation/RouteStatCards.tsx)):**
  * Karta 1: Szacowany czas marszu i godzina przybycia (np. `18 min | przyjazd 14:42`).
  * Karta 2: Dystans i profil architektoniczny (np. `1,2 km | bez schodów` lub `1,2 km | 2 przeszkody`).
* **Wysuwany dolny arkusz trasy ([`src/components/navigation/RouteTimelineSheet.tsx`](file:///home/bigguy/Desktop/projekty-kola-itp/hackyeah%202026/src/components/navigation/RouteTimelineSheet.tsx)):**
  * Nagłówek *„Co czeka Cię po drodze”* z wskaźnikiem pewności trasy: `✓ Trasa 86% pewna` (na podstawie średniego `confidence_score` barier na trasie).
  * Wertykalna oś czasu ze zdarzeniami:
    * Precyzyjna, wycentrowana oś pionowa (`w-8 items-center`) – wyeliminowanie zjawiska braku wyrównania węzłów osi.
    * Wektorowa ikona docelowa SVG `Flag` zamiast niestabilnego formatowania tekstu emoji.
    * Punkt startowy (błękitny znacznik A),
    * Wykryte bariery i udogodnienia na trasie (ze zdjęciami i tagami),
    * Kolejne manewry i zmiany ulic,
    * Punkt końcowy (czerwony znacznik flagi mety).
  * **Integracja z mową (Web Speech API):**
    * Dedykowany przycisk `🔊 Włącz opis głosowy trasy`.
    * Wykorzystuje `window.speechSynthesis` z polskim głosem (`pl-PL`), czytający kolejne manewry i ostrzeżenia o schodach/krawężnikach dla osób niedowidzących.

---

### Załącznik 3: Karta „Utwórz trasę” & Modal Dostępności (Settings Button)
* **Domyślny profil:** Domyślnym profilem wyznaczania trasy jest **Pieszy** (`foot_walking`, optymalny czas marszu miejskiego ~4.3 km/h).
* **Minimalistyczny interfejs zgodny z Załącznikiem 3:**
  * Usunięto zbędny widget przełączania profili na rzecz czystego, minimalistycznego widoku.
  * Pełna konfiguracja profili i barier odbywa się za pomocą dedykowanego przycisku suwaków (`SlidersHorizontal`) obok pola startowego.
* **Karta wyszukiwania trasy ([`src/components/navigation/RouteSearchCard.tsx`](file:///home/bigguy/Desktop/projekty-kola-itp/hackyeah%202026/src/components/navigation/RouteSearchCard.tsx)):**
  * Nagłówek w kolorze głębokiej śliwki/burgundu (`#4c0519`) z tekstem *„Utwórz trasę”* oraz plakietką informacyjną wyświetlaną w przypadku wyboru profilu specjalnego (wózek, dziecięcy, niedowidzący).
  * Dwa wejścia w kształcie pigułek (`rounded-full`):
    * Punkt początkowy: zielony punkt wskaźnikowy, pole tekstowe, przycisk czyszczenia.
    * Punkt docelowy: fioletowy punkt wskaźnikowy, pole tekstowe.
  * Przycisk suwaków (`SlidersHorizontal`) otwierający dedykowany modal preferencji dostępności.
  * Tryb manualnego wskazywania punktów na mapie chroniony checkboxem.
* **Modal preferencji dostępności ([`src/components/navigation/AccessibilityFilterModal.tsx`](file:///home/bigguy/Desktop/projekty-kola-itp/hackyeah%202026/src/components/navigation/AccessibilityFilterModal.tsx)):**
  * Szybki wybór profilu z dedykowaną kolorystyką (wózek = niebieski, pieszy = zielony, dziecięcy = różowy, niedowidzący = bursztynowy).
  * Szczegółowe filtry:
    * Maksymalna wysokość krawężnika (suwak 2 cm – 15 cm),
    * Bezwzględne omijanie schodów bez ramp,
    * Wymagane poręcze przy schodach,
    * Unikanie nawierzchni z kostki brukowej.

### Załącznik 4: Eksploracja, Poziom Użytkownika Light Theme & Misje Codzienne (2x XP)
* **Przebudowa Poziomu Użytkownika na Light Theme ([`src/components/gamification/DiscoveryBanner.tsx`](file:///home/bigguy/Desktop/projekty-kola-itp/hackyeah%202026/src/components/gamification/DiscoveryBanner.tsx)):**
  * Usunięto przestarzały, ciemny gradient na rzecz czystego, kontrastowego białego kontenera (`bg-white border-slate-200/90 shadow-sm rounded-3xl`).
  * Ergonomiczny układ mobilny: duża plakietka poziomu (`Poziom X`), tytuł rangi, status GPS/Planer, licznik punktów XP oraz pasek postępu.
  * Karty metryk siatki Uber H3 (odkryte komórki i zaudytowane zdjęcia).
* **2 Misje Dnia z Mnożnikiem 2x XP:**
  * **Misja 1:** *„Wejście do Parku Krakowskiego (Krowodrza)”* – zdjęcia schodów, +200 XP (mnożnik 2x).
  * **Misja 2:** *„Odkryj 5 nowych kafelków w centrum”* – eksploracja mgły wojny, +100 XP (mnożnik 2x).
* **Modal Szczegółów Misji ([`src/components/gamification/DailyQuestModal.tsx`](file:///home/bigguy/Desktop/projekty-kola-itp/hackyeah%202026/src/components/gamification/DailyQuestModal.tsx)):**
  * Wdrożono wysuwany arkusz dolny (*Bottom Sheet*) dokładnie według Załącznika 4:
    * Etykieta odległości: `18 m od Ciebie`,
    * Tytuł i kategoria w zaokrąglonym magentowym bloczku z ikoną schodów,
    * Różowy panel jakości: `2 dotychczasowe sprawdzenia`, odznaka `Bardzo słabo sprawdzone`, 5-segmentowy pasek postępu i uzasadnienie wartości zdjęcia,
    * Etykiety premii: `🏆 +200 XP za wykonanie zadania`, `Premia za rzadkie miejsce`,
    * Magentowy przycisk CTA: `Zrób zdjęcie i zalicz zadanie (Zajmie około 30 sekund)`.

---

## 🏛️ 4. Dolny Pasek Nawigacyjny (`BottomNavigation.tsx`)

Aplikacja mobilna posiada stały, ergonomiczny pasek dolny z 5 zakładkami:
1. **Mapa (`map`):** Pełnoekranowy widok Krakowa z siatką H3, pozycją GPS, mgłą wojny i punktami barier.
2. **Trasa (`route`):** Widok wyszukiwania i aktywnej nawigacji z banerem manewru i osią czasu.
3. **Eksploracja (`leaderboard`):** Poziom użytkownika w Light Theme, misje codzienne (2x XP) i statystyki heksagonów H3 (ikona `Compass`).
4. **Dodaj (`crowdsource`):** Szybkie zgłoszenie nowej przeszkody z geolokalizacją i uploadem zdjęcia do Supabase Storage.
5. **Profil (`profile`):** Informacje o użytkowniku, ranga, ustawienia konta i tryb GPS na żywo.

---

## 📁 5. Struktura Nowych i Zmodyfikowanych Plików

| Plik | Typ | Rola w Systemie |
| :--- | :--- | :--- |
| `src/constants/theme.ts` | **Nowy** | Centralna definicja Design Tokens (kolory, typografia, cienie, promienie). |
| `src/components/profile/ProfileView.tsx` | **Nowy** | Pełny widok profilu w Light Theme: zarządzanie kontem, status rangi gracza, przełącznik GPS na żywo, narzędzie Bad Actor Purge i informacje o WCAG. |
| `src/components/layout/BottomNavigation.tsx` | Modyfikacja | Mobilny dolny pasek nawigacyjny z 5 zakładkami (zakładka *Eksploracja* z ikoną `Compass`). |
| `src/components/gamification/DailyQuestModal.tsx` | **Nowy** | Wysuwany arkusz misji dnia (Załącznik 4) z 5 segmentami, odznaką i CTA do zdjęcia. |
| `src/components/gamification/DiscoveryBanner.tsx` | Modyfikacja | Przepisanie na czysty Light Theme, karty mobilne i listę 2 misji dziennych z mnożnikiem 2x XP. |
| `src/components/navigation/RouteSearchCard.tsx` | **Nowy** | Karta „Utwórz trasę” z polami-pigułkami i przyciskiem filtrów. |
| `src/components/navigation/AccessibilityFilterModal.tsx` | **Nowy** | Modal wyboru profilu i parametrów dostępności trasy ze spójną kolorystyką. |
| `src/components/navigation/TurnBanner.tsx` | **Nowy** | Górny ciemny baner manewrów turn-by-turn. |
| `src/components/navigation/RouteStatCards.tsx` | **Nowy** | Pływające kafelki z czasem, godziną dotarcia i dystansem. |
| `src/components/navigation/RouteTimelineSheet.tsx` | **Nowy** | Wysuwany arkusz barier z precyzyjnie wyrównaną osią pionową (`w-8 items-center`) i lektorem Web Speech API. |
| `src/components/map/AccessibleMap.tsx` | Modyfikacja | Zielone heksagony trasy H3, ergonomiczne kontrolki zoom po prawej, filtry barier trasy, **nowe propsy `activeQuest` / `onSelectQuest`** i efekt renderujący magentowy znacznik misji (`questLayerRef`). |
| `src/components/map/mapIcons.ts` | Modyfikacja | Generator ikon Leaflet `createBarrierPillIcon` oraz **nowa funkcja `createQuestMarkerIcon(xpReward)`** – pulsujący magentowy pin z ikoną aparatu i chipem XP dla znacznika misji dnia. |
| `src/app/page.tsx` | Modyfikacja | Integracja mobilnego kontenera portrait, zakładki Eksploracja, pigułki misji, **stan `explorationModeEnabled` z hydratacją z `localStorage` (`krakow_exploration_mode`)**, global `DailyQuestModal` sterowany z markera mapy i pigułki. |
| `src/types/gamification.ts` | **Nowy** | Centralna definicja interfejsu `DailyQuest` (wyekstrahowana z `DailyQuestModal.tsx`). Importowana przez `AccessibleMap.tsx`, `page.tsx` i `DailyQuestModal.tsx` (który re-eksportuje typ dla wstecznej kompatybilności). |
| `src/app/globals.css` | Modyfikacja | Wyłączenie ciemnego motywu, czyste tła, style typografii Plus Jakarta Sans. |
| `src/app/layout.tsx` | Modyfikacja | Podpięcie czcionki Google Font `Plus_Jakarta_Sans` z podzbiorem `latin-ext`. |

---

## ♿ 6. Dostępność Cyfrowa (WCAG 2.2 AA) w Nowym UI

Refaktoring w pełni respektuje zasady dostępności opisane w [`AGENTS.md`](file:///home/bigguy/Desktop/projekty-kola-itp/hackyeah%202026/AGENTS.md):
1. **Pewność Informacji:** Brak danych o odcinku nigdy nie oznacza braku przeszkody – w arkuszu trasy odcinki niezweryfikowane prezentują status `Stan nieznany (brak audytu)`.
2. **Pola Metadanych Barier:** Wszystkie wyświetlane obiekty barier zachowują atrybuty `source`, `confidence_score` oraz `last_verified_at`.
3. **Ekwiwalent Tekstowy dla Mapy:** Wszystkie informacje prezentowane graficznie na mapie mają pełny odpowiednik w drzewie DOM w arkuszu `RouteTimelineSheet` oraz są odczytywane przez wbudowany syntezator mowy.
4. **Obsługa Klawiatury:** Wszystkie interaktywne kontrolki, pola tekstowe i modale obsługują `Tab`, `Shift+Tab`, `Enter` oraz `Escape`.
5. **Minimalny Kontrast:** Ciemny tekst (`#0f172a`, `#4c0519`) na jasnym tle (`#ffffff`, `#f8fafc`) osiąga kontrast powyżej `7:1`, znacznie przekraczając wymóg `4.5:1`.

---

## 📊 7. Stan Prac & Progress Tracker

- [x] **Inicjalizacja brancha:** Utworzono dedykowany branch `feat/mobile-ui-refactor`.
- [x] **Design Tokens & Typografia:** Zdefiniowano tokeny w `theme.ts` i wdrożono `Plus Jakarta Sans`.
- [x] **Wymuszenie Light Theme:** Usunięto media queries ciemnego motywu w `globals.css`.
- [x] **Załącznik 1 (Mapa & H3):**
  - [x] Zielone heksagony trasy w trybie live navigation (`#34d399` / `#059669`).
  - [x] Pigułki barier na mapie (`createBarrierPillIcon`).
  - [x] Pływający przycisk `Dodaj zdjęcie / Przejmij sektor`.
  - [x] Pływający przycisk CTA `Apply`.
- [x] **Załącznik 2 (Nawigacja & Timeline):**
  - [x] Ciemny baner manewru `TurnBanner.tsx` z żółtą ikoną i odległością.
  - [x] Pływające karty statystyk `RouteStatCards.tsx` (czas, przyjazd, dystans).
  - [x] Wysuwany dolny arkusz `RouteTimelineSheet.tsx` z odznaką pewności trasy.
  - [x] Synteza mowy Web Speech API (`pl-PL`) z przyciskiem włączania lektora.
- [x] **Załącznik 3 (Wyszukiwanie & Preferencje):**
  - [x] Karta `RouteSearchCard.tsx` z burgundowym nagłówkiem i polami pigułkowymi.
  - [x] Przycisk odwracania A/B i czyszczenia pól.
  - [x] Modal `AccessibilityFilterModal.tsx` z profilami i suwakami barier.
- [x] **Dolna Nawigacja Mobilna:** Komponent `BottomNavigation.tsx` z 5 zakładkami.
- [x] **Integracja w `src/app/page.tsx`:** Responsywny kontener `max-w-md mx-auto min-h-screen`.
- [x] **Refaktoring Top Baru & Zakładki Profil:**
  - [x] Usunięto podpisy techniczne `WCAG 2.2 AA • PostGIS` z lewego górnego rogu.
  - [x] Powiększono i wyeksponowano nazwę aplikacji (*Kraków bez barier*).
  - [x] Zastąpiono klikalną ikonkę w prawym górnym rogu eleganckim, nieklikalnym kafelkiem z nazwą użytkownika, poziomem i punktami XP (`Poz. X • Y XP`).
  - [x] Przeniesiono pełne ustawienia konta, przełącznik wędrówki GPS na żywo oraz narzędzie moderacji `BadActorPurgeModal` do zakładki **Profil** (`ProfileView.tsx`).
  - [x] Wszystkie elementy w 100% w jasnym motywie (Light Theme) i w języku polskim.
- [x] **Ujednolicenie Geometrii i Dostępność dla Osób Słabowidzących (Low Vision):**
  - [x] **Ujednolicenie rounding:** Kafelek *Misja Dnia* na mapie głównej ma teraz to samo zaokrąglenie `rounded-full` i wysokość `min-h-[48px]` co pigułka wyszukiwania trasy.
  - [x] **Skala bazowa typografii:** Ustawiono `html { font-size: 17px; }` w `globals.css`, co powiększa całą aplikację o ~10% dla optymalnej czytelności.
  - [x] **Eliminacja mikroskopijnych fontów:** Zastąpiono `text-[9px]`, `text-[10px]`, `text-[11px]` czytelnymi klasami `text-xs font-bold`, `text-sm font-bold` oraz `text-base` w całej aplikacji.
  - [x] **Zwiększony kontrast etykiet:** Poprawiono kontrast podpisów manewrów w `TurnBanner`, odznak w `DiscoveryBanner` oraz arkuszu `RouteTimelineSheet`.
- [x] **Refaktoring Przycisku Dodaj Zdjęcie & Przełącznika Siatki Heksagonów:**
  - [x] Przycisk pływający *Dodaj zdjęcie*: usunięto napis *„Przejmij sektor”*, zastąpiono odznaką *„+100 XP”*.
  - [x] Nowy styl jasnego motywu: fioletowe tło (`bg-purple-600`), biały kontener na ikonę aparatu (`bg-white text-purple-700`).
  - [x] Zmiana etykiety przycisku siatki na *„Ukryj siatkę heksagonów”* / *„Pokaż siatkę heksagonów”* (bez dopisku H3).
  - [x] Dodano przycisk przełączania siatki zarówno w zakładce **Eksploracja** (`DiscoveryBanner.tsx`), jak i w zakładce **Profil** (`ProfileView.tsx`).
- [x] **Refaktoring Sekcji „Dodaj” (Zgłoś utrudnienie):**
  - [x] Usunięto dopisek `(Crowdsourcing)`.
  - [x] Przepisano cały formularz na czysty, jasny motyw (`bg-white rounded-3xl`, usunięto klasy dark mode).
  - [x] Zmieniono terminologię w całym UI z *„bariera”* na *„utrudnienie”* (*Zgłoś utrudnienie*, *Rodzaj utrudnienia*, *Dodaj utrudnienie do bazy*).
  - [x] Usunięto tekst *„Dotknij mapy lub kliknij…”* z pola lokalizacji; gdy lokalizacja/GPS jest aktywna, automatycznie wyświetlane są sformatowane współrzędne.
  - [x] Zastąpiono domyślny przycisk przeglądarki `Choose file` estetycznym, dedykowanym przyciskiem z ikoną aparatu i etykietą **„Zrób zdjęcie”**.
- [x] **Tryb Eksploracji Krakowa (Exploration Mode) z Persystencją LocalStorage:**
  - [x] Nowy klucz lokalnego przechowywania: **`krakow_exploration_mode`** (`'true'` / `'false'`). Stan jest hydratowany przy każdym uruchomieniu aplikacji.
  - [x] Hydratacja stanu przy montowaniu (`useEffect` -> `localStorage.getItem`) z ochroną przed SSR (`try/catch`).
  - [x] Zapis stanu (`handleToggleExplorationMode` via `useCallback` -> `localStorage.setItem`) w `src/app/page.tsx`.
  - [x] **Karta trybu eksploracji w zakładce Profil** (`ProfileView.tsx`): kolorowy pasek statusu `✓ AKTYWNY` / `WYŁĄCZONY`, ikona rakiety (`Rocket`), opis, siatka 4 feature-chipów (widoczna gdy aktywny) i duży przycisk-toggle z `aria-pressed`.
  - [x] **Warunkowa pigułka misji dnia na mapie** – widoczna wyłącznie gdy `explorationModeEnabled === true` i brak aktywnej trasy. Kliknięcie otwiera globalny `DailyQuestModal`.
  - [x] **Magentowy znacznik misji na mapie Leaflet** – nowa funkcja `createQuestMarkerIcon(xpReward)` w `mapIcons.ts`; renderowana przez dedykowaną warstwę `questLayerRef` w `AccessibleMap.tsx`. Kliknięcie otwiera `DailyQuestModal`.
  - [x] **Globalny `DailyQuestModal`** w `page.tsx` – wyzwalany zarówno przez marker mapy, jak i pigułkę. Akcja CTA przekierowuje do zakładki *Dodaj* z lokalizacją misji jako `pickedLocation`.
  - [x] **Współdzielony typ `DailyQuest`** -> `src/types/gamification.ts`; `DailyQuestModal.tsx` re-eksportuje dla wstecznej kompatybilności.
- [x] **Rzeczywiste Dane Miejskie Krakowa & Nawierzchnie Brukowane (`feat/real-data-surfaces`):**
  - [x] Zaimportowano **8 283 rzeczywistych przeszkód z OpenStreetMap** (7 058 schodków z liczbą stopni, podjazdami, poręczami i płytami dotykowymi; 1 225 ulic i placów brukowanych).
  - [x] Wdrożono endpoint `/api/surfaces` serwujący warstwę GeoJSON bruków i placów.
  - [x] Interaktywny przycisk włączania/wyłączania warstwy brukowanej na mapie Leaflet z WCAG targetem 44x44px.
  - [x] Rzutowanie ortogonalne na geometrię trasy (`minDistanceToPolyline` z `distancePointToSegmentMeters`).
  - [x] Rozróżnienie przeszkód bezpośrednich vs. pobocznych (`is_nearby: true` > 8 m od osi trasy) – wyszarzenie w odcieniu łupkowym (`bg-slate-400` / `#64748b`), brak kar czasowych i fałszywych alarmów.
  - [x] Interaktywność osi czasu: kliknięcie przeszkody na liście przełącza na mapę, centruje na współrzędnych i otwiera dymek informacyjny.
  - [x] Usunięcie emotek z typów powierzchni (zastąpienie ikonami wektorowymi Lucide `Layers`).
  - [x] Przycisk **„Inna trasa”** w wyrazistej magencie `#d90479` z białą ikoną `X` bezpośrednio obok widgetu manewru na mapie.
  - [x] Przebudowa paska wyszukiwania: hasło **„Dokąd dziś?”** o zwiększonej dostępności (kontrastowe obramowanie 2px, duży font `text-base sm:text-lg font-black`).
  - [x] Skrócone, jednoliniowe etykiety profili na osi czasu (`🚶 Pieszy`, `♿ Wózek`, `👶 Wózek dz.`, `👁️ Wzrok`) z poprawną polską odmianą liczby punktów (`X punktów na trasie`).
  - [x] Korekta współrzędnych startu Parku Bednarskiego na `50.042714, 19.948461`.
- [x] **Testy Jednostkowe & Kompilacja:**
  - [x] Vitest: **27/27** testów passing (`npm test`).
  - [x] Next.js Build: Pomyślna kompilacja wszystkich **16 tras** produkcyjnych (`npm run build`).
