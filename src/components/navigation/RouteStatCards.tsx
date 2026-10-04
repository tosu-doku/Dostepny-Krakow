'use client';

import React from 'react';
import { RouteResult } from '@/types/routing';

interface RouteStatCardsProps {
  route: RouteResult;
}

export default function RouteStatCards({ route }: RouteStatCardsProps) {
  // Format duration (minutes)
  const durationMinutes = Math.max(1, Math.round(route.total_duration_seconds / 60));

  // Calculate arrival time
  const now = new Date();
  const arrivalDate = new Date(now.getTime() + route.total_duration_seconds * 1000);
  const arrivalTime = arrivalDate.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Format distance
  const distanceKm = (route.total_distance_meters / 1000).toLocaleString('pl-PL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  // Determine accessibility feature summary (Attachment 2 style: "bez schodów", "łagodne rampy")
  const hasStairs = route.all_barriers?.some((b) => b.barrier_type === 'STAIRS');
  const obstacleSub = hasStairs ? 'wymaga asysty' : 'bez schodów';

  return (
    <div className="flex items-center gap-2.5">
      {/* Duration Card */}
      <div className="flex-1 bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-md border border-slate-200/80">
        <div className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
          {durationMinutes} min
        </div>
        <div className="text-xs sm:text-sm font-bold text-slate-600 mt-0.5">
          przybycie {arrivalTime}
        </div>
      </div>

      {/* Distance Card */}
      <div className="flex-1 bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-md border border-slate-200/80">
        <div className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
          {distanceKm} km
        </div>
        <div className="text-xs sm:text-sm font-bold text-slate-600 mt-0.5 capitalize">
          {obstacleSub}
        </div>
      </div>
    </div>
  );
}
