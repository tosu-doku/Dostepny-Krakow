'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Maximize2, X, ZoomIn } from 'lucide-react';

interface BarrierImageGalleryProps {
  images: string[];
  title?: string;
}

export default function BarrierImageGallery({ images = [], title = 'Zdjęcie przeszkody' }: BarrierImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadError, setLoadError] = useState<Record<number, boolean>>({});
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, images.length]);

  if (!images || images.length === 0) {
    return null;
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImg = images[currentIndex];
  const hasError = loadError[currentIndex];

  return (
    <>
      <div className="relative mt-2.5 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-950 text-white shadow-sm">
        {/* Main Image Container with Realistic Proportions */}
        <div
          onClick={() => !hasError && setIsLightboxOpen(true)}
          className="relative w-full h-64 sm:h-72 bg-zinc-900 flex items-center justify-center overflow-hidden cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsLightboxOpen(true);
            }
          }}
          aria-label={`Kliknij, aby powiększyć zdjęcie: ${title}`}
        >
          {hasError ? (
            <div className="flex flex-col items-center justify-center text-zinc-400 p-4 text-center z-10">
              <ImageIcon className="w-8 h-8 mb-1 opacity-60" />
              <span className="text-xs">Podgląd zdjęcia niedostępny</span>
              <a
                href={currentImg}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-blue-400 underline mt-1"
              >
                Otwórz link zewnętrzny
              </a>
            </div>
          ) : (
            <>
              {/* Ambient blurred backdrop so vertical and horizontal images look beautiful without black voids */}
              <img
                src={currentImg}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-35 select-none pointer-events-none"
              />

              {/* Main photo with 100% full preservation of details (no clipping stairs!) */}
              <img
                src={currentImg}
                alt={`${title} - zdjęcie ${currentIndex + 1} z ${images.length}`}
                className={`w-full h-full relative z-10 transition-all duration-200 drop-shadow-md ${
                  fitMode === 'contain' ? 'object-contain' : 'object-cover'
                }`}
                onError={() => setLoadError((prev) => ({ ...prev, [currentIndex]: true }))}
              />

              {/* Hover Zoom Indicator */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center pointer-events-none">
                <span className="bg-black/75 backdrop-blur-xs text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/20 shadow-md">
                  <ZoomIn className="w-4 h-4" /> Powiększ zdjęcie
                </span>
              </div>
            </>
          )}

          {/* Counter Badge */}
          {images.length > 1 && (
            <span className="absolute top-2.5 right-2.5 z-30 bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20 shadow-xs">
              {currentIndex + 1} / {images.length}
            </span>
          )}

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Poprzednie zdjęcie"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 bg-black/65 hover:bg-black/90 text-white p-2 rounded-full backdrop-blur-xs transition-colors cursor-pointer border border-white/10 hover:scale-105 active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Następne zdjęcie"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 bg-black/65 hover:bg-black/90 text-white p-2 rounded-full backdrop-blur-xs transition-colors cursor-pointer border border-white/10 hover:scale-105 active:scale-95"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Footer with Fit Toggle & Full View link */}
        <div className="p-2 px-3 bg-zinc-900/95 text-xs text-zinc-300 flex items-center justify-between border-t border-zinc-800">
          <span className="truncate max-w-[200px] text-zinc-400 font-medium">{title}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFitMode((m) => (m === 'contain' ? 'cover' : 'contain'))}
              className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
              title="Przełącz tryb dopasowania"
            >
              {fitMode === 'contain' ? 'Dopasuj całość' : 'Wypełnij'}
            </button>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="text-blue-400 hover:text-blue-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Pełny ekran
            </button>
          </div>
        </div>
      </div>

      {/* Accessible Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Podgląd zdjęcia w pełnym rozmiarze"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar */}
          <div className="w-full max-w-5xl flex items-center justify-between text-white pb-3 z-20">
            <div className="text-sm font-semibold truncate">
              {title} {images.length > 1 && `(${currentIndex + 1} z ${images.length})`}
            </div>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Zamknij podgląd"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Image Display */}
          <div
            className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImg}
              alt={`${title} - powiększone zdjęcie`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl drop-shadow-2xl"
            />

            {/* Modal Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Poprzednie zdjęcie"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/75 hover:bg-black text-white p-3 rounded-full transition-all hover:scale-110 cursor-pointer border border-white/20 shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Następne zdjęcie"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/75 hover:bg-black text-white p-3 rounded-full transition-all hover:scale-110 cursor-pointer border border-white/20 shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          <div className="text-zinc-400 text-xs mt-3 flex items-center gap-4">
            <span>Użyj strzałek ◀ ▶ na klawiaturze do nawigacji</span>
            <span>•</span>
            <a
              href={currentImg}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Pobierz oryginalne zdjęcie
            </a>
          </div>
        </div>
      )}
    </>
  );
}
