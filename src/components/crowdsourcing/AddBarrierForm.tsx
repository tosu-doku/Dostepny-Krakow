'use client';

import { useState } from 'react';
import { BarrierType } from '@/types/barrier';
import { Camera, MapPin, PlusCircle, Check, AlertCircle, Loader2 } from 'lucide-react';

interface AddBarrierFormProps {
  selectedLocation: { lat: number; lng: number } | null;
  onBarrierCreated: () => void;
  onSelectCurrentLocation: () => void;
}

export default function AddBarrierForm({
  selectedLocation,
  onBarrierCreated,
  onSelectCurrentLocation,
}: AddBarrierFormProps) {
  const [barrierType, setBarrierType] = useState<BarrierType>('STAIRS');
  const [addressDescription, setAddressDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Stairs specifics
  const [stepCount, setStepCount] = useState<number>(4);
  const [hasRamp, setHasRamp] = useState<boolean>(false);
  const [handrail, setHandrail] = useState<boolean>(true);

  // High kerb specifics
  const [kerbHeight, setKerbHeight] = useState<number>(12);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) {
      setStatusMessage({
        type: 'error',
        text: 'Wskaż punkt na mapie lub kliknij „Użyj mojej lokalizacji”.',
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append('barrier_type', barrierType);
      formData.append('latitude', selectedLocation.lat.toString());
      formData.append('longitude', selectedLocation.lng.toString());
      formData.append('address_description', addressDescription);

      let details: Record<string, any> = {};
      if (barrierType === 'STAIRS') {
        details = { step_count: stepCount, has_ramp: hasRamp, handrail };
      } else if (barrierType === 'HIGH_KERB') {
        details = { height_cm: kerbHeight };
      }
      formData.append('details', JSON.stringify(details));

      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await fetch('/api/barriers', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Nie udało się dodać bariery');
      }

      setStatusMessage({
        type: 'success',
        text: 'Bariera została pomyślnie zgłoszona i dodana do bazy PostGIS!',
      });
      setPhotoFile(null);
      setAddressDescription('');
      onBarrierCreated();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Wystąpił błąd podczas dodawania bariery.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3.5 sm:p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm flex flex-col gap-3.5 sm:gap-4"
      aria-label="Formularz zgłaszania bariery architektonicznej"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-600 shrink-0" aria-hidden="true" />
            Zgłoś Barierę (Crowdsourcing)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Pomóż innym mieszkańcom Krakowa tworzyć rzetelną bazę przeszkód.
          </p>
        </div>
      </div>

      {/* Wybór Lokalizacji */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Lokalizacja zgłoszenia:</span>
          <button
            type="button"
            onClick={onSelectCurrentLocation}
            className="min-h-[34px] px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded hover:bg-blue-100 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            Użyj GPS
          </button>
        </div>
        {selectedLocation ? (
          <p className="text-zinc-900 dark:text-zinc-100 font-mono text-xs">
            {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)} (wybrano punkt)
          </p>
        ) : (
          <p className="text-zinc-500 italic">Dotknij mapy lub kliknij „Użyj GPS”.</p>
        )}
      </div>

      {/* Typ Bariery */}
      <div>
        <label htmlFor="barrier-type" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
          Rodzaj bariery:
        </label>
        <select
          id="barrier-type"
          value={barrierType}
          onChange={(e) => setBarrierType(e.target.value as BarrierType)}
          className="w-full min-h-[44px] text-sm sm:text-xs p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
        >
          <option value="STAIRS">Schody (stopnie)</option>
          <option value="HIGH_KERB">Wysoki krawężnik</option>
          <option value="STEEP_INCLINE">Stromy podjazd / pochylenie</option>
          <option value="COBBLESTONE_SURFACE">Nierówna kostka / kocie łby</option>
          <option value="NARROW_SIDEWALK">Wąski chodnik (zwężenie)</option>
          <option value="NO_TACTILE_PAVING">Brak pasów fakturowych (dla niewidomych)</option>
          <option value="ELEVATOR_OUT_OF_ORDER">Awaria windy</option>
        </select>
      </div>

      {/* Pola specyficzne dla Schodów (wymóg AGENTS.md) */}
      {barrierType === 'STAIRS' && (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded border border-zinc-200 dark:border-zinc-700 space-y-3">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Szczegóły schodów:</p>
          <div>
            <label htmlFor="step-count" className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
              Liczba stopni:
            </label>
            <input
              id="step-count"
              type="number"
              min={1}
              max={100}
              value={stepCount}
              onChange={(e) => setStepCount(Number(e.target.value))}
              className="w-full text-xs p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={hasRamp}
                onChange={(e) => setHasRamp(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Obecny podjazd / rampa</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={handrail}
                onChange={(e) => setHandrail(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Obecna poręcz</span>
            </label>
          </div>
        </div>
      )}

      {/* Pola dla Wysokiego Krawężnika */}
      {barrierType === 'HIGH_KERB' && (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded border border-zinc-200 dark:border-zinc-700">
          <label htmlFor="kerb-height" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
            Wysokość krawężnika (cm):
          </label>
          <input
            id="kerb-height"
            type="number"
            min={1}
            max={50}
            value={kerbHeight}
            onChange={(e) => setKerbHeight(Number(e.target.value))}
            className="w-full text-xs p-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          />
        </div>
      )}

      {/* Opis Adresu */}
      <div>
        <label htmlFor="address-desc" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
          Opis miejsca / adres (opcjonalnie):
        </label>
        <input
          id="address-desc"
          type="text"
          value={addressDescription}
          onChange={(e) => setAddressDescription(e.target.value)}
          placeholder="np. ul. Floriańska przy skrzyżowaniu ze św. Tomasza"
          className="w-full text-xs p-2.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
        />
      </div>

      {/* Zdjęcie */}
      <div>
        <label htmlFor="photo-file" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
          Zdjęcie przeszkody (opcjonalnie):
        </label>
        <div className="flex items-center gap-2">
          <input
            id="photo-file"
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 hover:file:bg-zinc-200 cursor-pointer"
          />
        </div>
      </div>

      {/* Status komunikatu */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3 rounded text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-green-50 text-green-900 border border-green-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !selectedLocation}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 text-white font-bold text-sm rounded-lg shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Zapisywanie w bazie PostGIS...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" aria-hidden="true" />
            Dodaj Barierę do Bazy
          </>
        )}
      </button>
    </form>
  );
}
