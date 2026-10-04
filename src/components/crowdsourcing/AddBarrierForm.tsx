'use client';

import React, { useState } from 'react';
import { BarrierType } from '@/types/barrier';
import { User } from '@/types/user';
import {
  Camera,
  MapPin,
  PlusCircle,
  Check,
  AlertCircle,
  Loader2,
  UserCheck,
  UserX,
  FileCheck,
  X,
} from 'lucide-react';

interface AddBarrierFormProps {
  selectedLocation: { lat: number; lng: number } | null;
  onBarrierCreated: (info?: { latitude: number; longitude: number; hasPhoto: boolean }) => void;
  onSelectCurrentLocation: () => void;
  currentUser?: User | null;
}

export default function AddBarrierForm({
  selectedLocation,
  onBarrierCreated,
  onSelectCurrentLocation,
  currentUser,
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
        text: 'Wskaż punkt na mapie lub kliknij „Użyj GPS”.',
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

      if (currentUser?.id) {
        formData.append('created_by', currentUser.id);
      }

      const res = await fetch('/api/barriers', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Nie udało się dodać utrudnienia');
      }

      const createdBarrier = await res.json().catch(() => null);

      setStatusMessage({
        type: 'success',
        text: 'Utrudnienie zostało pomyślnie zgłoszone i dodane do bazy danych!',
      });
      const hadPhoto = !!photoFile || !!(createdBarrier && createdBarrier.image_url);
      const loc = { lat: selectedLocation.lat, lng: selectedLocation.lng };
      setPhotoFile(null);
      setAddressDescription('');
      onBarrierCreated({
        latitude: loc.lat,
        longitude: loc.lng,
        hasPhoto: hadPhoto,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Wystąpił błąd podczas dodawania utrudnienia.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 bg-white border border-slate-200/90 rounded-3xl shadow-sm flex flex-col gap-4 animate-in fade-in duration-200"
      aria-label="Formularz zgłaszania utrudnienia architektonicznego"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-purple-600 shrink-0" aria-hidden="true" />
            Zgłoś utrudnienie
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Pomóż innym mieszkańcom Krakowa aktualizować bazę utrudnień architektonicznych.
          </p>
        </div>
      </div>

      {/* Informacja o autorze zgłoszenia */}
      <div className="p-3 rounded-2xl border text-xs flex items-center gap-2.5 bg-slate-50 border-slate-200/80">
        {currentUser ? (
          <>
            <UserCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span className="text-slate-700 font-medium">
              Autor zgłoszenia: <strong className="text-slate-900 font-extrabold">{currentUser.nickname}</strong>
            </span>
          </>
        ) : (
          <>
            <UserX className="w-4.5 h-4.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-medium leading-relaxed">
              Zgłoszenie anonimowe. Zaloguj się w zakładce Profil, aby powiązać zgłoszenie z kontem i zdobywać punkty XP.
            </span>
          </>
        )}
      </div>

      {/* Wybór Lokalizacji */}
      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-xs text-slate-800">Lokalizacja zgłoszenia:</span>
          <button
            type="button"
            onClick={onSelectCurrentLocation}
            className="px-3 py-1.5 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors border border-purple-200"
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            Użyj GPS
          </button>
        </div>

        {selectedLocation ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 rounded-xl px-3 py-2 text-emerald-900 font-mono text-xs font-bold">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
            </span>
            <span className="text-[11px] font-sans text-emerald-700 ml-auto font-extrabold">
              (aktywna)
            </span>
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-semibold py-1">
            Brak ustalonej lokalizacji
          </div>
        )}
      </div>

      {/* Typ Utrudnienia */}
      <div>
        <label htmlFor="barrier-type" className="text-xs font-extrabold text-slate-700 block mb-1.5">
          Rodzaj utrudnienia:
        </label>
        <select
          id="barrier-type"
          value={barrierType}
          onChange={(e) => setBarrierType(e.target.value as BarrierType)}
          className="w-full min-h-[48px] text-sm font-semibold p-3 rounded-2xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all shadow-2xs"
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

      {/* Pola specyficzne dla Schodów */}
      {barrierType === 'STAIRS' && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <p className="text-xs font-extrabold text-slate-800">Szczegóły schodów:</p>
          <div>
            <label htmlFor="step-count" className="text-xs font-bold text-slate-600 block mb-1">
              Liczba stopni:
            </label>
            <input
              id="step-count"
              type="number"
              min={1}
              max={100}
              value={stepCount}
              onChange={(e) => setStepCount(Number(e.target.value))}
              className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hasRamp}
                onChange={(e) => setHasRamp(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <span>Obecny podjazd / rampa</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={handrail}
                onChange={(e) => setHandrail(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <span>Obecna poręcz</span>
            </label>
          </div>
        </div>
      )}

      {/* Pola dla Wysokiego Krawężnika */}
      {barrierType === 'HIGH_KERB' && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <label htmlFor="kerb-height" className="text-xs font-extrabold text-slate-800 block">
            Wysokość krawężnika (cm):
          </label>
          <input
            id="kerb-height"
            type="number"
            min={1}
            max={50}
            value={kerbHeight}
            onChange={(e) => setKerbHeight(Number(e.target.value))}
            className="w-full text-sm font-semibold p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-purple-600"
          />
        </div>
      )}

      {/* Opis Adresu */}
      <div>
        <label htmlFor="address-desc" className="text-xs font-extrabold text-slate-700 block mb-1.5">
          Opis miejsca / adres (opcjonalnie):
        </label>
        <input
          id="address-desc"
          type="text"
          value={addressDescription}
          onChange={(e) => setAddressDescription(e.target.value)}
          placeholder="np. ul. Floriańska przy skrzyżowaniu ze św. Tomasza"
          className="w-full text-sm font-semibold p-3 rounded-2xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all shadow-2xs"
        />
      </div>

      {/* Zdjęcie (Przycisk "Zrób zdjęcie" zamiast domyślnego "Choose file") */}
      <div className="space-y-1.5">
        <label htmlFor="photo-file" className="text-xs font-extrabold text-slate-700 block">
          Zdjęcie utrudnienia (opcjonalnie):
        </label>

        <label
          htmlFor="photo-file"
          className="w-full min-h-[50px] px-4 py-3 bg-purple-50/60 hover:bg-purple-100/70 border border-purple-200 border-dashed rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer transition-colors group"
        >
          <Camera className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform shrink-0" />
          <span className="text-sm font-black text-purple-900">
            {photoFile ? photoFile.name : 'Zrób zdjęcie'}
          </span>
          <input
            id="photo-file"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            className="sr-only"
          />
        </label>

        {photoFile && (
          <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 font-semibold">
            <span className="truncate flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{photoFile.name}</span>
            </span>
            <button
              type="button"
              onClick={() => setPhotoFile(null)}
              className="text-red-600 hover:text-red-700 font-extrabold ml-2 cursor-pointer flex items-center gap-1 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Usuń</span>
            </button>
          </div>
        )}
      </div>

      {/* Status komunikatu */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || !selectedLocation}
        className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 focus:ring-4 focus:ring-purple-200 text-white font-black text-sm sm:text-base rounded-2xl shadow-md shadow-purple-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Zapisywanie w bazie danych...</span>
          </>
        ) : (
          <>
            <PlusCircle className="w-5 h-5" aria-hidden="true" />
            <span>Dodaj utrudnienie do bazy</span>
          </>
        )}
      </button>
    </form>
  );
}
