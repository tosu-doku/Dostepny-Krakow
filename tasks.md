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

- [ ] **Zadanie 7: Responsywność na urządzenia mobilne (Mobile UI/UX)**
  - Optymalizacja widoku dla smartfonów (np. wygodne przełączanie między mapą a panelem kroków / wysuwany bottom-sheet).
  - Wymiary elementów dotykowych min. 44x44px (zgodnie z WCAG 2.2 Target Size).
  - Płynne skalowanie mapy i pełnoekranowej galerii na wąskich ekranach.
  - Przetestowanie formularza zgłaszania barier w terenie z aparatem telefonu i geolokalizacją GPS.
