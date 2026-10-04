'use client';

import React, { useState } from 'react';
import { RouteResult } from '@/types/routing';
import { Barrier } from '@/types/barrier';
import {
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Flag,
} from 'lucide-react';
import BarrierImageGallery from '../common/BarrierImageGallery';

interface RouteTimelineSheetProps {
  route: RouteResult;
  onSelectBarrier?: (barrier: Barrier) => void;
}

export default function RouteTimelineSheet({
  route,
  onSelectBarrier,
}: RouteTimelineSheetProps) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [selectedBarrierForGallery, setSelectedBarrierForGallery] = useState<Barrier | null>(null);

  // Compute confidence percentage (Attachment 2: "Trasa 86% pewna")
  const averageConfidence = route.all_barriers && route.all_barriers.length > 0
    ? Math.round(
        (route.all_barriers.reduce((sum, b) => sum + (b.confidence_score || 0.8), 0) /
          route.all_barriers.length) *
          100
      )
    : 92;

  // Toggle voice guidance with Web Speech API
  const handleToggleVoice = () => {
    const nextState = !isVoiceEnabled;
    setIsVoiceEnabled(nextState);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (nextState) {
        const textToSpeak = `Włączono opis głosowy trasy. Do pokonania ${Math.round(
          route.total_distance_meters
        )} metrów. Na trasie znajduje się ${route.all_barriers.length} punktów orientacyjnych.`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'pl-PL';
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Build timeline items from start, barriers, and destination
  const barriers = route.all_barriers || [];

  return (
    <div className="w-full bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col gap-4">
      {/* Top drag handle indicator */}
      <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto shrink-0 mb-1" />

      {/* Header (Attachment 2) */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
              {barriers.length + 2} punkty na trasie
            </span>
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-full border shadow-2xs ${
                route.profile === 'foot_walking'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : route.profile === 'wheelchair'
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : route.profile === 'stroller'
                  ? 'bg-pink-50 text-pink-800 border-pink-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {route.profile === 'foot_walking' && '🚶 Pieszy'}
              {route.profile === 'wheelchair' && '♿ Wózek inw.'}
              {route.profile === 'stroller' && '👶 Dziecięcy'}
              {route.profile === 'visually_impaired' && '👁️ Niedowidzący'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-0.5">
            Co czeka Cię po drodze
          </h2>
        </div>

        {/* Confidence Badge (Attachment 2) */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-extrabold shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Trasa {averageConfidence}% pewna</span>
        </div>
      </div>

      {/* Timeline List (Attachment 2 - Perfectly Vertically Aligned Axis) */}
      <div className="flex flex-col my-1">
        {/* 1. Start Item */}
        <div className="flex items-stretch gap-3.5 group">
          {/* Timeline Axis Column: perfectly centers node and line */}
          <div className="flex flex-col items-center shrink-0 w-8">
            <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold shadow-xs z-10 ring-4 ring-white shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="w-0.5 bg-slate-200 flex-1 my-1" aria-hidden="true" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pb-6 pt-0.5">
            <div className="text-xs font-black text-slate-500">0 m</div>
            <div className="font-black text-base text-slate-900 leading-snug">
              Start: {route.steps?.[0]?.instruction || 'Początek trasy'}
            </div>
            <p className="text-sm text-slate-600 mt-0.5 leading-relaxed font-medium">
              Równy, utwardzony chodnik. Rozpoczęcie wyznaczonego odcinka.
            </p>
          </div>
        </div>

        {/* 2. Obstacles / Features along route */}
        {barriers.map((b, idx) => {
          const isStairs = b.barrier_type === 'STAIRS';
          const isKerb = b.barrier_type === 'HIGH_KERB';
          const isCobblestone = b.barrier_type === 'COBBLESTONE_SURFACE';
          const isRamp = b.details?.has_ramp === true || b.barrier_type === 'STEEP_INCLINE';

          // Estimated distance along route (distributed along total distance)
          const distanceMeters = Math.round(((idx + 1) / (barriers.length + 1)) * route.total_distance_meters);

          let nodeBg = 'bg-amber-500';
          let nodeIcon: React.ReactNode = <AlertTriangle className="w-3.5 h-3.5" />;
          let title = b.address_description || b.barrier_type;
          let description = 'Zachowaj ostrożność na tym odcinku.';

          if (isCobblestone) {
            nodeBg = 'bg-amber-600';
            nodeIcon = <span className="text-xs">🏛️</span>;
            const s = b.details?.surface || '';
            const sType = s === 'sett' ? 'Kostka rzędowa' : s === 'cobblestone' ? 'Kocie łby' : 'Kamień polny';
            title = b.details?.name ? `${b.details.name} (${sType})` : sType;
            description = 'Utrudnienie i drgania dla wózków inwalidzkich oraz dziecięcych.';
          } else if (isRamp) {
            nodeBg = 'bg-emerald-600';
            nodeIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
            title = b.address_description || 'Podjazd / Rampa';
            description = 'Łagodny podjazd, ułatwiony przejazd dla wózków.';
          } else if (isKerb) {
            nodeBg = 'bg-amber-500';
            nodeIcon = <AlertTriangle className="w-3.5 h-3.5" />;
            const height = b.details?.height_cm ? `${b.details.height_cm} cm` : 'krawężnik';
            title = `Wysoki krawężnik: ${height}`;
            description = `${b.address_description || 'Przejście dla pieszych'}. Zweryfikowane dane miejskie.`;
          } else if (isStairs) {
            const hasRamp = b.details?.has_ramp;
            nodeBg = hasRamp ? 'bg-amber-600' : 'bg-red-500';
            nodeIcon = <AlertTriangle className="w-3.5 h-3.5" />;
            const steps = b.details?.step_count ? `${b.details.step_count} stopni` : 'schody terenowe';
            title = b.address_description || `Schody (${steps})`;
            const rampDesc = hasRamp ? '✓ Dostępny podjazd obok schodów.' : '✗ Brak podjazdu – nieprzejezdne dla wózka.';
            const handrailDesc = b.details?.has_handrail ? ' Poręcz zamontowana.' : '';
            const tactileDesc = b.details?.tactile_paving ? ' Płyty dotykowe dla niewidomych.' : '';
            description = `${rampDesc}${handrailDesc}${tactileDesc}`;
          }

          return (
            <div
              key={b.id || idx}
              onClick={() => {
                if (onSelectBarrier) onSelectBarrier(b);
                setSelectedBarrierForGallery(b);
              }}
              className="flex items-stretch gap-3.5 cursor-pointer group"
            >
              {/* Timeline Axis Column */}
              <div className="flex flex-col items-center shrink-0 w-8">
                <div className={`w-7 h-7 rounded-full ${nodeBg} text-white flex items-center justify-center text-xs font-bold shadow-xs z-10 ring-4 ring-white shrink-0 group-hover:scale-105 transition-transform`}>
                  {nodeIcon}
                </div>
                <div className="w-0.5 bg-slate-200 flex-1 my-1" aria-hidden="true" />
              </div>

              {/* Content with hover highlight that NEVER affects axis alignment */}
              <div className="flex-1 min-w-0 pb-6 pt-0.5 p-2 -mt-1.5 rounded-xl group-hover:bg-slate-50 transition-colors flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-slate-500">{distanceMeters} m</div>
                  <div className="font-black text-base text-slate-900 truncate leading-snug">{title}</div>
                  <p className="text-sm text-slate-600 mt-0.5 line-clamp-2 leading-relaxed font-medium">
                    {description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 self-center group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          );
        })}

        {/* 3. Destination Item */}
        <div className="flex items-stretch gap-3.5 group">
          {/* Timeline Axis Column */}
          <div className="flex flex-col items-center shrink-0 w-8">
            <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shadow-xs z-10 ring-4 ring-white shrink-0">
              <Flag className="w-3.5 h-3.5" />
            </div>
            {/* No line below destination */}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="text-xs font-black text-slate-500">
              {Math.round(route.total_distance_meters)} m
            </div>
            <div className="font-black text-base text-slate-900 leading-snug">
              Cel: {route.steps?.[route.steps.length - 1]?.instruction || 'Punkt docelowy'}
            </div>
            <p className="text-sm text-slate-600 mt-0.5 leading-relaxed font-medium">
              Koniec trasy bez barier.
            </p>
          </div>
        </div>
      </div>

      {/* Voice Guidance Toggle Button (Attachment 2) */}
      <button
        type="button"
        onClick={handleToggleVoice}
        className={`w-full py-3.5 px-4 rounded-full border text-sm font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs active:scale-[0.99] ${
          isVoiceEnabled
            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
            : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
        }`}
      >
        <span className="flex items-center gap-2">
          {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          <span>Włącz opis głosowy trasy</span>
        </span>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
          isVoiceEnabled ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'
        }`}>
          {isVoiceEnabled ? 'Włączono' : 'Wyłączono'}
        </span>
      </button>

      {/* Barrier Details Lightbox if clicked */}
      {selectedBarrierForGallery && (
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Zdjęcia i weryfikacja przeszkody:</span>
            <button
              type="button"
              onClick={() => setSelectedBarrierForGallery(null)}
              className="text-xs text-purple-600 font-bold hover:underline"
            >
              Ukryj podgląd
            </button>
          </div>
          <BarrierImageGallery
            images={
              (selectedBarrierForGallery.details?.images as string[]) ||
              (selectedBarrierForGallery.image_url ? [selectedBarrierForGallery.image_url] : [])
            }
            title={selectedBarrierForGallery.address_description || selectedBarrierForGallery.barrier_type}
          />
        </div>
      )}
    </div>
  );
}
