'use client';

import React, { useEffect } from 'react';
import { NavigationProfile } from '@/types/routing';
import { X, Accessibility, Baby, Eye, Footprints, Check } from 'lucide-react';

interface AccessibilityFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProfile: NavigationProfile;
  onSelectProfile: (profile: NavigationProfile) => void;
}

interface ProfileOption {
  id: NavigationProfile;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  selectedBorder: string;
  checkBg: string;
}

const PROFILES: ProfileOption[] = [
  {
    id: 'foot_walking',
    title: 'Pieszy (Domyślny)',
    subtitle: 'Optymalna miejska trasa piesza (~4.3 km/h) bez ograniczeń architektonicznych.',
    icon: Footprints,
    accentColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    selectedBorder: 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/30',
    checkBg: 'bg-emerald-600 text-white',
  },
  {
    id: 'wheelchair',
    title: 'Wózek inwalidzki',
    subtitle: 'Unikanie schodów, krawężniki max 4 cm, preferencja łagodnych podjazdów i ramp.',
    icon: Accessibility,
    accentColor: 'text-blue-600 bg-blue-50 border-blue-200',
    selectedBorder: 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/30',
    checkBg: 'bg-blue-600 text-white',
  },
  {
    id: 'stroller',
    title: 'Wózek dziecięcy',
    subtitle: 'Nacisk na łagodne rampy, szerokie chodniki i omijanie uszkodzonych nawierzchni.',
    icon: Baby,
    accentColor: 'text-pink-600 bg-pink-50 border-pink-200',
    selectedBorder: 'border-pink-600 bg-pink-50/60 ring-2 ring-pink-600/30',
    checkBg: 'bg-pink-600 text-white',
  },
  {
    id: 'visually_impaired',
    title: 'Osoba niedowidząca',
    subtitle: 'Wsparcie pasów fakturowych, sygnalizacji dźwiękowej i stałych punktów odniesienia.',
    icon: Eye,
    accentColor: 'text-amber-600 bg-amber-50 border-amber-200',
    selectedBorder: 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/30',
    checkBg: 'bg-amber-500 text-white',
  },
];

export default function AccessibilityFilterModal({
  isOpen,
  onClose,
  selectedProfile,
  onSelectProfile,
}: AccessibilityFilterModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 id="accessibility-modal-title" className="text-lg font-bold text-slate-900">
              Ustawienia Dostępności
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dostosuj algorytm wyznaczania trasy do swoich potrzeb.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij ustawienia"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Options */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {PROFILES.map((p) => {
            const isSelected = selectedProfile === p.id;
            const Icon = p.icon;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelectProfile(p.id);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  isSelected
                    ? `${p.selectedBorder} shadow-xs`
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${p.accentColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{p.title}</span>
                    {isSelected && (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${p.checkBg}`}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-full shadow-md transition-colors cursor-pointer"
        >
          Zastosuj preferencje
        </button>
      </div>
    </div>
  );
}
