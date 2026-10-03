'use client';

import { RouteResult } from '@/types/routing';
import { AlertTriangle, CheckCircle2, HelpCircle, Clock, Info } from 'lucide-react';
import BarrierImageGallery from '@/components/common/BarrierImageGallery';

interface RouteObstacleListProps {
  route: RouteResult | null;
  isLoading?: boolean;
}

export default function RouteObstacleList({ route, isLoading }: RouteObstacleListProps) {
  if (isLoading) {
    return (
      <div
        className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm"
        aria-live="polite"
      >
        <p className="text-zinc-700 dark:text-zinc-300 font-medium animate-pulse flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600 animate-spin" />
          Wyznaczanie trasy i analiza barier architektonicznych...
        </p>
      </div>
    );
  }

  if (!route) {
    return (
      <div
        className="p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-center"
        aria-live="polite"
      >
        <p className="text-zinc-600 dark:text-zinc-400">
          Wybierz punkty trasy i profil dostępności, aby wygenerować trasę oraz zestawienie przeszkód.
        </p>
      </div>
    );
  }

  const { summary, steps } = route;

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {/* Podsumowanie Dostępności */}
      <section
        className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm"
        aria-labelledby="summary-heading"
      >
        <h2 id="summary-heading" className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Raport Dostępności Trasy
        </h2>

        <div className="grid grid-cols-2 gap-2 text-sm text-zinc-700 dark:text-zinc-300 mb-3">
          <div>
            Dystans: <strong className="text-zinc-900 dark:text-zinc-100">{summary.total_steps > 0 ? `${(route.total_distance_meters / 1000).toFixed(2)} km` : '0 m'}</strong>
          </div>
          <div>
            Szacowany czas: <strong className="text-zinc-900 dark:text-zinc-100">{Math.round(route.total_duration_seconds / 60)} min</strong>
          </div>
          <div>
            Liczba barier: <strong className="text-zinc-900 dark:text-zinc-100">{summary.barrier_count}</strong>
          </div>
          <div>
            Krytyczne utrudnienia: <strong className="text-red-600 font-bold">{summary.high_risk_barriers_count}</strong>
          </div>
        </div>

        {/* AGENTS.md Kluczowa Zasada Rzetelności */}
        {summary.has_unknown_audit ? (
          <div
            className="p-3 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded text-amber-900 dark:text-amber-200 text-sm flex items-start gap-2.5"
            role="alert"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
            <div>
              <strong>Uwaga – stan nieznany na {summary.unverified_steps_count} odcinkach:</strong>
              <p className="mt-1 text-xs">
                Brak zarejestrowanych przeszkód na części trasy nie oznacza braku barier. Zachowaj ostrożność.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="p-3 bg-green-50 dark:bg-green-950/40 border-l-4 border-green-600 rounded text-green-900 dark:text-green-200 text-sm flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600" aria-hidden="true" />
            <span>Trasa w pełni pokryta zaktualizowanymi audytami miejskimi.</span>
          </div>
        )}
      </section>

      {/* Lista Krok po Kroku (WCAG Text Equivalent) */}
      <section
        className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm"
        aria-labelledby="steps-heading"
      >
        <h3 id="steps-heading" className="text-md font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center justify-between">
          <span>Przebieg trasy krok po kroku</span>
          <span className="text-xs font-normal text-zinc-500">
            {steps.length} {steps.length === 1 ? 'odcinek' : 'odcinków'}
          </span>
        </h3>

        <ol className="divide-y divide-zinc-200 dark:divide-zinc-800 list-none p-0 m-0">
          {steps.map((step, idx) => (
            <li key={step.id} className="py-3 focus-within:bg-zinc-50 dark:focus-within:bg-zinc-800/50 rounded px-2 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {step.instruction}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {step.distance_meters} m • ok. {Math.round(step.duration_seconds / 60) || 1} min
                  </p>

                  {/* Etykieta Audytu */}
                  <div className="mt-2">
                    {step.audit_status === 'STAN_NIEZNANY' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        Stan nieznany
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        <Info className="w-3.5 h-3.5" aria-hidden="true" />
                        Zweryfikowany odcinek
                      </span>
                    )}
                  </div>

                  {/* Lista barier na danym kroku */}
                  {step.barriers.length > 0 && (
                    <div className="mt-3 pl-3 border-l-2 border-red-500 space-y-2">
                      <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">
                        Przeszkody na tym odcinku:
                      </p>
                      {step.barriers.map((barrier) => {
                        const barrierImages: string[] = [];
                        if (barrier.image_url) barrierImages.push(barrier.image_url);
                        if (Array.isArray(barrier.details?.images)) {
                          barrier.details.images.forEach((img: any) => {
                            if (typeof img === 'string' && !barrierImages.includes(img)) {
                              barrierImages.push(img);
                            }
                          });
                        }

                        return (
                          <div
                            key={barrier.id}
                            className="bg-red-50 dark:bg-red-950/30 p-2.5 rounded text-xs text-zinc-800 dark:text-zinc-200 border border-red-200 dark:border-red-900"
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-red-800 dark:text-red-300">
                                {barrier.barrier_type}
                              </span>
                              <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                                Wiarygodność: {(barrier.confidence_score * 100).toFixed(0)}%
                              </span>
                            </div>

                            {barrier.address_description && (
                              <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
                                {barrier.address_description}
                              </p>
                            )}

                            {barrier.details && Object.keys(barrier.details).length > 0 && (
                              <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                                {barrier.details.step_count !== undefined && (
                                  <span>Stopnie: {barrier.details.step_count} • </span>
                                )}
                                {barrier.details.has_ramp !== undefined && (
                                  <span>Podjazd: {barrier.details.has_ramp ? 'Tak' : 'Brak'} • </span>
                                )}
                                {barrier.details.handrail !== undefined && (
                                  <span>Poręcz: {barrier.details.handrail ? 'Tak' : 'Brak'} • </span>
                                )}
                                {barrier.details.height_cm !== undefined && (
                                  <span>Wysokość: {barrier.details.height_cm} cm • </span>
                                )}
                              </div>
                            )}

                            {/* Image Gallery */}
                            {barrierImages.length > 0 && (
                              <BarrierImageGallery
                                images={barrierImages}
                                title={barrier.address_description || barrier.barrier_type}
                              />
                            )}

                            <div className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between border-t border-red-100 dark:border-red-900/50 pt-1">
                              <span>Źródło: {barrier.source} ({barrier.status})</span>
                              <span>{new Date(barrier.last_verified_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
