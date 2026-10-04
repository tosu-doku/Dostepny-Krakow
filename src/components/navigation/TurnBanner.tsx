'use client';

import React from 'react';
import { RouteStep } from '@/types/routing';
import { CornerUpRight, CornerUpLeft, ArrowUp } from 'lucide-react';

interface TurnBannerProps {
  currentStep?: RouteStep | null;
  nextStep?: RouteStep | null;
  remainingDistanceMeters?: number;
}

export default function TurnBanner({
  currentStep,
  nextStep,
}: TurnBannerProps) {
  const stepToDisplay = currentStep || nextStep;
  if (!stepToDisplay) return null;

  const distanceText = stepToDisplay.distance_meters > 0
    ? `Za ${Math.round(stepToDisplay.distance_meters)} metrów`
    : 'Następny manewr';

  const instructionText = stepToDisplay.instruction || 'Podążaj wyznaczoną trasą';

  // Determine turn icon based on instruction text or maneuver
  const isRight = instructionText.toLowerCase().includes('prawo');
  const isLeft = instructionText.toLowerCase().includes('lewo');

  const TurnIcon = isRight ? CornerUpRight : isLeft ? CornerUpLeft : ArrowUp;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full max-w-sm mx-auto bg-slate-900 text-white rounded-3xl p-3.5 sm:p-4 shadow-xl border border-slate-800 flex items-center gap-3.5 transition-all animate-in fade-in slide-in-from-top-2 duration-300"
    >
      {/* Yellow Icon Tile (Attachment 2) */}
      <div className="w-12 h-12 rounded-2xl bg-[#f59e0b] text-slate-950 flex items-center justify-center shrink-0 shadow-md">
        <TurnIcon className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
      </div>

      {/* Maneuver Text (Attachment 2) */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          {distanceText}
        </div>
        <div className="text-sm sm:text-base font-extrabold text-white truncate leading-tight mt-0.5">
          {instructionText}
        </div>
      </div>
    </div>
  );
}
