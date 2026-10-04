'use client';

import React from 'react';
import { NavigationProfile } from '@/types/routing';
import {
  Footprints,
  Accessibility,
  Baby,
  Eye,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

interface ProfilePreferenceWidgetProps {
  selectedProfile: NavigationProfile;
  onSelectProfile: (profile: NavigationProfile) => void;
  onOpenSettings?: () => void;
}

interface ProfileConfig {
  id: NavigationProfile;
  shortLabel: string;
  fullTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  description: string;
  theme: {
    // When button is active
    activeButton: string;
    // When button is inactive
    inactiveButton: string;
    // Info box styles
    infoBg: string;
    infoBorder: string;
    infoBadge: string;
    infoText: string;
    infoLink: string;
  };
}

const PROFILE_CONFIGS: Record<NavigationProfile, ProfileConfig> = {
  foot_walking: {
    id: 'foot_walking',
    shortLabel: 'Pieszy',
    fullTitle: 'Pieszy (Domyślny)',
    icon: Footprints,
    tagline: 'Standardowy profil miejski',
    description: 'Optymalny czas marszu miejskiego (~4.3 km/h). Brak ograniczeń schodów i krawężników.',
    theme: {
      activeButton: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30',
      inactiveButton: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/90',
      infoBg: 'bg-emerald-50/90',
      infoBorder: 'border-emerald-200',
      infoBadge: 'bg-emerald-600 text-white',
      infoText: 'text-emerald-950',
      infoLink: 'text-emerald-700 hover:text-emerald-900 border-emerald-300',
    },
  },
  wheelchair: {
    id: 'wheelchair',
    shortLabel: 'Wózek inw.',
    fullTitle: 'Wózek inwalidzki',
    icon: Accessibility,
    tagline: 'Maksymalna dostępność bez schodów',
    description: 'Bezwzględne omijanie schodów, krawężniki max 4 cm, priorytet podjazdów, ramp i wind.',
    theme: {
      activeButton: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30',
      inactiveButton: 'bg-blue-50/80 text-blue-800 border-blue-200/80 hover:bg-blue-100/90',
      infoBg: 'bg-blue-50/90',
      infoBorder: 'border-blue-200',
      infoBadge: 'bg-blue-600 text-white',
      infoText: 'text-blue-950',
      infoLink: 'text-blue-700 hover:text-blue-900 border-blue-300',
    },
  },
  stroller: {
    id: 'stroller',
    shortLabel: 'Dziecięcy',
    fullTitle: 'Wózek dziecięcy',
    icon: Baby,
    tagline: 'Wygoda i łagodne nachylenie',
    description: 'Omijanie schodów bez ramp, unikanie nierównego bruku i wąskich przejść chodnikowych.',
    theme: {
      activeButton: 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-600/30',
      inactiveButton: 'bg-pink-50/80 text-pink-800 border-pink-200/80 hover:bg-pink-100/90',
      infoBg: 'bg-pink-50/90',
      infoBorder: 'border-pink-200',
      infoBadge: 'bg-pink-600 text-white',
      infoText: 'text-pink-950',
      infoLink: 'text-pink-700 hover:text-pink-900 border-pink-300',
    },
  },
  visually_impaired: {
    id: 'visually_impaired',
    shortLabel: 'Niedowidzący',
    fullTitle: 'Osoba niedowidząca',
    icon: Eye,
    tagline: 'Audyt fakturowy i asysta audio',
    description: 'Wsparcie pasów fakturowych, sygnalizacji dźwiękowej i czytanych wskazówek nawigacyjnych.',
    theme: {
      activeButton: 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30',
      inactiveButton: 'bg-amber-50/80 text-amber-800 border-amber-200/80 hover:bg-amber-100/90',
      infoBg: 'bg-amber-50/90',
      infoBorder: 'border-amber-200',
      infoBadge: 'bg-amber-500 text-white',
      infoText: 'text-amber-950',
      infoLink: 'text-amber-700 hover:text-amber-900 border-amber-300',
    },
  },
};

const ORDERED_PROFILES: NavigationProfile[] = [
  'foot_walking',
  'wheelchair',
  'stroller',
  'visually_impaired',
];

export default function ProfilePreferenceWidget({
  selectedProfile,
  onSelectProfile,
  onOpenSettings,
}: ProfilePreferenceWidgetProps) {
  const currentConfig = PROFILE_CONFIGS[selectedProfile] || PROFILE_CONFIGS.foot_walking;
  const ActiveIcon = currentConfig.icon;

  return (
    <div
      role="region"
      aria-label="Wybór profilu i preferencji dostępności"
      className="w-full flex flex-col gap-2.5"
    >
      {/* Top Label & Mode Indicator */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" aria-hidden="true" />
          <span>Preferencje trasy</span>
        </span>
        <span className="text-[11px] font-semibold text-slate-500">
          Domyślnie: <strong className="text-emerald-700">Pieszy</strong>
        </span>
      </div>

      {/* 4 Profile Buttons with native colors */}
      <div
        role="radiogroup"
        aria-label="Dostępne profile poruszania się"
        className="grid grid-cols-4 gap-1.5"
      >
        {ORDERED_PROFILES.map((profileId) => {
          const cfg = PROFILE_CONFIGS[profileId];
          const Icon = cfg.icon;
          const isSelected = selectedProfile === profileId;

          return (
            <button
              key={profileId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectProfile(profileId)}
              className={`py-2 px-1 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? `${cfg.theme.activeButton} font-bold ring-2 ring-offset-1 ring-slate-400/30`
                  : `${cfg.theme.inactiveButton} font-medium`
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-[11px] leading-tight block truncate w-full">
                {cfg.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Profile Info Banner with exact matching color */}
      <div
        className={`p-3 rounded-2xl border ${currentConfig.theme.infoBg} ${currentConfig.theme.infoBorder} ${currentConfig.theme.infoText} transition-all duration-200 shadow-2xs flex flex-col gap-1.5`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center ${currentConfig.theme.infoBadge} shadow-2xs shrink-0`}
            >
              <ActiveIcon className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span className="text-xs font-black tracking-tight">
              {currentConfig.fullTitle}
            </span>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border bg-white/80 hover:bg-white transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${currentConfig.theme.infoLink}`}
            >
              <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
              <span>Dostosuj</span>
            </button>
          )}
        </div>

        <p className="text-[11px] leading-relaxed text-slate-700 font-medium">
          {currentConfig.description}
        </p>
      </div>
    </div>
  );
}
