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
  Info,
  Layers,
} from 'lucide-react';
import BarrierImageGallery from '../common/BarrierImageGallery';

interface RouteTimelineSheetProps {
  route: RouteResult;
  startName?: string;
  endName?: string;
  onSelectBarrier?: (barrier: Barrier) => void;
}

export default function RouteTimelineSheet({
  route,
  startName,
  endName,
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
  const totalPoints = barriers.length + 2;

  const pointsCountText =
    totalPoints === 1
      ? '1 punkt na trasie'
      : totalPoints % 10 >= 2 && totalPoints % 10 <= 4 && (totalPoints % 100 < 10 || totalPoints % 100 >= 20)
      ? `${totalPoints} punkty na trasie`
      : `${totalPoints} punktów na trasie`;

  return (
    <div className="w-full bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col gap-4">
      {/* Top drag handle indicator */}
      <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto shrink-0 mb-1" />

      {/* Header (Attachment 2) */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              {pointsCountText}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full border shadow-2xs whitespace-nowrap shrink-0 ${
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
              {route.profile === 'wheelchair' && '♿ Wózek'}
              {route.profile === 'stroller' && '👶 Wózek dz.'}
              {route.profile === 'visually_impaired' && '👁️ Wzrok'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-1 truncate">
            Co czeka Cię po drodze
          </h2>
        </div>

        {/* Confidence Badge (Attachment 2) */}
        <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-extrabold shrink-0 whitespace-nowrap">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
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
            <div className="text-xs font-black text-slate-500">0 m • START</div>
            <div className="font-black text-base text-slate-900 leading-snug">
              Start: {startName || 'Początek trasy'}
            </div>
            <p className="text-sm text-slate-600 mt-0.5 leading-relaxed font-medium">
              {route.steps?.[0]?.instruction || 'Równy, utwardzony chodnik. Rozpoczęcie wyznaczonego odcinka.'}
            </p>
          </div>
        </div>

        {/* 2. Obstacles / Features along route */}
        {barriers.map((b, idx) => {
          const isStairs = b.barrier_type === 'STAIRS';
          const isKerb = b.barrier_type === 'HIGH_KERB';
          const isCobblestone = b.barrier_type === 'COBBLESTONE_SURFACE';
          const isRamp = b.details?.has_ramp === true || b.barrier_type === 'STEEP_INCLINE';
          const isNearby = b.is_nearby || (typeof b.distance_from_route === 'number' && b.distance_from_route > 8);

          // Estimated distance along route (distributed along total distance)
          const distanceMeters = Math.round(((idx + 1) / (barriers.length + 1)) * route.total_distance_meters);

          let nodeBg = 'bg-amber-500';
          let nodeIcon: React.ReactNode = <AlertTriangle className="w-3.5 h-3.5" />;
          let title = b.address_description || b.barrier_type;
          let description = 'Zachowaj ostrożność na tym odcinku.';

          if (isCobblestone) {
            nodeBg = 'bg-amber-600';
            nodeIcon = <Layers className="w-3.5 h-3.5" />;
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

          // When obstacle is in the vicinity but not traversed directly, display in muted gray (not red/amber!)
          if (isNearby) {
            nodeBg = 'bg-slate-400';
            nodeIcon = <Info className="w-3.5 h-3.5 text-white" />;
            if (isStairs) {
              const steps = b.details?.step_count ? `${b.details.step_count} st.` : 'schody';
              title = b.address_description ? `${b.address_description} (obok trasy)` : `Schody (${steps}) – obok trasy`;
              description = `Schody znajdują się w pobliżu (${b.distance_from_route || 15} m od toru, np. wejście do budynku). Wyznaczona trasa ich nie pokonuje.`;
            } else if (isKerb) {
              title = `${b.address_description || 'Krawężnik'} – w pobliżu trasy`;
              description = `Krawężnik znajduje się obok trasy (${b.distance_from_route || 15} m), poza bezpośrednim torem przejścia.`;
            } else if (isCobblestone) {
              title = `${title} – obok trasy`;
              description = `Nawierzchnia brukowana znajduje się w pobliżu trasy (${b.distance_from_route || 15} m obok).`;
            } else {
              title = `${title} – w pobliżu trasy`;
              description = `Utrudnienie znajduje się w odległości ${b.distance_from_route || 15} m od wyznaczonego toru.`;
            }
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
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-black text-slate-500">
                    <span>{distanceMeters} m</span>
                    {isNearby && (
                      <>
                        <span>•</span>
                        <span className="text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                          W pobliżu trasy ({b.distance_from_route || 15} m obok)
                        </span>
                      </>
                    )}
                  </div>
                  <div className={`font-black text-base truncate leading-snug mt-0.5 ${isNearby ? 'text-slate-700' : 'text-slate-900'}`}>
                    {title}
                  </div>
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
              {Math.round(route.total_distance_meters)} m • CEL
            </div>
            <div className="font-black text-base text-slate-900 leading-snug">
              Cel: {endName || 'Punkt docelowy'}
            </div>
            <p className="text-sm text-slate-600 mt-0.5 leading-relaxed font-medium">
              Koniec trasy bez barier. Dotarcie do wyznaczonego miejsca docelowego.
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
