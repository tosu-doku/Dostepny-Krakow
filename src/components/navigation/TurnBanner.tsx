'use client';

import React from 'react';
import { RouteStep } from '@/types/routing';
import { CornerUpRight, CornerUpLeft, ArrowUp } from 'lucide-react';

interface TurnBannerProps {
  currentStep?: RouteStep | null;
  nextStep?: RouteStep | null;
  remainingDistanceMeters?: number;
  startName?: string;
  endName?: string;
}

export default function TurnBanner({
  currentStep,
  nextStep,
  startName,
  endName,
}: TurnBannerProps) {
  const stepToDisplay = currentStep || nextStep;
  if (!stepToDisplay) return null;

  const distanceText = stepToDisplay.distance_meters > 0
    ? `Za ${Math.round(stepToDisplay.distance_meters)} metrów`
    : 'Rozpoczęcie trasy';

  const instructionText = stepToDisplay.instruction || 'Podążaj wyznaczoną trasą';

  // Determine turn icon based on instruction text or maneuver
  const isRight = instructionText.toLowerCase().includes('prawo');
  const isLeft = instructionText.toLowerCase().includes('lewo');

  const TurnIcon = isRight ? CornerUpRight : isLeft ? CornerUpLeft : ArrowUp;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full max-w-sm mx-auto bg-gradient-to-r from-purple-100/95 via-purple-50/95 to-indigo-100/95 backdrop-blur-md text-slate-900 rounded-3xl p-3.5 sm:p-4 shadow-xl shadow-purple-900/10 border-2 border-purple-200/90 flex flex-col gap-2 transition-all animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="flex items-center gap-3.5">
        {/* Purple Icon Tile */}
        <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/30">
          <TurnIcon className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
        </div>

        {/* Maneuver Text */}
        <div className="flex-1 min-w-0">
          <div className="text-xs sm:text-sm font-extrabold text-purple-700 tracking-wide uppercase">
            {distanceText}
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 truncate leading-tight mt-0.5">
            {instructionText}
          </div>
        </div>
      </div>

      {/* Skąd i Dokąd zmierzamy */}
      {(startName || endName) && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-purple-200/80 text-xs min-w-0">
          <div className="inline-flex items-center gap-1 truncate text-slate-700 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
            <span className="text-slate-500 font-semibold shrink-0">Skąd:</span>
            <span className="font-bold text-slate-900 truncate">{startName || 'Początek trasy'}</span>
          </div>
          <span className="text-purple-400 font-black shrink-0 px-0.5">➔</span>
          <div className="inline-flex items-center gap-1 truncate text-purple-950 min-w-0 flex-1 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span className="text-purple-700 font-semibold shrink-0">Dokąd:</span>
            <span className="font-black text-purple-950 truncate">{endName || 'Cel trasy'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
