'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Barrier } from '@/types/barrier';
import { KRAKOW_GRID_CONFIG, parseTileId, tileToBounds } from '@/services/grid';

interface AccessibleMapProps {
  start?: { lat: number; lng: number } | null;
  end?: { lat: number; lng: number } | null;
  routeCoordinates?: [number, number][]; // [[lng, lat], ...]
  barriers?: Barrier[];
  selectedLocation?: { lat: number; lng: number } | null;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  onSelectBarrier?: (barrier: Barrier) => void;
  discoveredTileIds?: string[];
  auditedTileIds?: string[];
  showDiscoveryGrid?: boolean;
  onTileClick?: (tileId: string) => void;
  currentGpsCoords?: { lat: number; lng: number } | null;
  centerOnGpsTrigger?: number;
}

export default function AccessibleMap({
  start,
  end,
  routeCoordinates = [],
  barriers = [],
  selectedLocation,
  onMapClick,
  onSelectBarrier,
  discoveredTileIds = [],
  auditedTileIds = [],
  showDiscoveryGrid = false,
  onTileClick,
  currentGpsCoords = null,
  centerOnGpsTrigger = 0,
}: AccessibleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Callback refs to prevent remounting map when parent functions change
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const onSelectBarrierRef = useRef(onSelectBarrier);
  useEffect(() => {
    onSelectBarrierRef.current = onSelectBarrier;
  }, [onSelectBarrier]);

  const onTileClickRef = useRef(onTileClick);
  useEffect(() => {
    onTileClickRef.current = onTileClick;
  }, [onTileClick]);

  // Dedicated layer groups for clean, crash-free Leaflet updates
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const discoveryLayerRef = useRef<L.LayerGroup | null>(null);
  const userGpsLayerRef = useRef<L.LayerGroup | null>(null);
  const prevRouteKeyRef = useRef<string>('');

  // 1. Initialize Map ONCE
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Prevent container reuse issues in React StrictMode / HMR
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    // Center on Krakow (Rynek Główny)
    // zoomAnimation: false completely disables CSS transitionend race condition (_leaflet_pos)
    const map = L.map(mapContainerRef.current, {
      center: [50.0614, 19.9365],
      zoom: 14,
      zoomControl: true,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Create persistent layer groups
    routeLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    discoveryLayerRef.current = L.layerGroup().addTo(map);
    userGpsLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    // Invalidate size to ensure correct dimensions
    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // Ignore if unmounted
      }
    }, 150);

    mapInstanceRef.current = map;

    return () => {
      try {
        map.stop();
        map.off();
        map.remove();
      } catch {
        // Safe cleanup
      }
      mapInstanceRef.current = null;
    };
  }, []);

  // Invalidate map size whenever container is resized or toggled visible
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch {
          // ignore
        }
      }
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 2. Update Route Layer & Markers Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !routeLayer || !markersLayer) return;

    // Safely clear previous layers without triggering Leaflet animation glitches
    try {
      map.closePopup();
    } catch {
      // Ignore
    }
    routeLayer.clearLayers();
    markersLayer.clearLayers();

    // Draw Route Polyline
    let newBounds: L.LatLngBounds | null = null;
    if (routeCoordinates && routeCoordinates.length > 0) {
      const latLngs: [number, number][] = routeCoordinates.map(([lng, lat]) => [lat, lng]);
      const polyline = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      });
      polyline.addTo(routeLayer);
      newBounds = polyline.getBounds();
    }

    // Add Start Marker (A)
    if (start) {
      const startIcon = L.divIcon({
        className: 'custom-start-marker',
        html: `<div style="background-color:#16a34a;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.4);">A</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([start.lat, start.lng], { icon: startIcon, title: 'Punkt Startowy (A)' })
        .addTo(markersLayer)
        .bindPopup('<strong>Punkt startowy (A)</strong>');
    }

    // Add End Marker (B)
    if (end) {
      const endIcon = L.divIcon({
        className: 'custom-end-marker',
        html: `<div style="background-color:#dc2626;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.4);">B</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([end.lat, end.lng], { icon: endIcon, title: 'Punkt Docelowy (B)' })
        .addTo(markersLayer)
        .bindPopup('<strong>Punkt docelowy (B)</strong>');
    }

    // Add Selected / Picked Marker
    if (selectedLocation) {
      const pickedIcon = L.divIcon({
        className: 'custom-picked-marker',
        html: `<div style="background-color:#9333ea;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 0 10px rgba(147,51,234,0.7);">📍</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: pickedIcon,
        title: 'Wybrana lokalizacja',
      })
        .addTo(markersLayer)
        .bindPopup('<strong>Wybrany punkt na mapie</strong>');
    }

    // Add Barrier Markers
    barriers.forEach((b) => {
      const isStairs = b.barrier_type === 'STAIRS';
      const bgColor = isStairs ? '#b91c1c' : '#d97706';
      const symbol = isStairs ? '🪜' : '⚠️';

      const barrierIcon = L.divIcon({
        className: 'custom-barrier-marker',
        html: `<div style="background-color:${bgColor};color:white;width:30px;height:30px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);" title="${b.barrier_type}">${symbol}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const detailsStr = Object.entries(b.details || {})
        .filter(([k]) => k !== 'images' && k !== 'original_links')
        .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
        .join('');

      const hasImages = (b.details?.images && Array.isArray(b.details.images) && b.details.images.length > 0) || !!b.image_url;
      const photoBadge = hasImages ? '<div style="margin-top:4px;color:#2563eb;font-weight:bold;font-size:11px;">📷 Dostępne zdjęcia w panelu</div>' : '';

      const popupHtml = `
        <div style="min-width: 200px; font-family: sans-serif; font-size: 13px;">
          <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #111;">
            ${b.barrier_type}
          </h3>
          <p style="margin: 0 0 6px 0; color: #444;">${b.address_description || 'Brak opisu adresu'}</p>
          <ul style="margin: 0 0 6px 0; padding-left: 16px; color: #333;">
            ${detailsStr}
          </ul>
          ${photoBadge}
          <div style="font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 4px; margin-top: 4px;">
            <div><strong>Źródło:</strong> ${b.source}</div>
            <div><strong>Wiarygodność:</strong> ${(b.confidence_score * 100).toFixed(0)}% (${b.status})</div>
          </div>
        </div>
      `;

      const marker = L.marker([b.latitude, b.longitude], {
        icon: barrierIcon,
        title: `Bariera: ${b.barrier_type} (${b.address_description || ''})`,
      }).bindPopup(popupHtml);

      marker.on('click', () => {
        if (onSelectBarrierRef.current) {
          onSelectBarrierRef.current(b);
        }
      });

      marker.addTo(markersLayer);
    });

    // Auto-fit bounds only when route coordinates key changes
    const currentRouteKey = routeCoordinates.length > 0
      ? `${routeCoordinates[0][0]},${routeCoordinates[0][1]}-${routeCoordinates[routeCoordinates.length - 1][0]}-${routeCoordinates.length}`
      : '';

    if (newBounds && newBounds.isValid() && currentRouteKey !== prevRouteKeyRef.current) {
      prevRouteKeyRef.current = currentRouteKey;
      try {
        // animate: false prevents the '_leaflet_pos' animation race condition in Leaflet!
        map.fitBounds(newBounds, {
          padding: [50, 50],
          maxZoom: 16,
          animate: false,
        });
      } catch (err) {
        console.warn('fitBounds warning:', err);
      }
    }
  }, [start, end, routeCoordinates, barriers, selectedLocation]);

  // 3. Update Fog of War / Exploration Grid Layer
  useEffect(() => {
    const discoveryLayer = discoveryLayerRef.current;
    if (!discoveryLayer) return;

    discoveryLayer.clearLayers();

    if (!showDiscoveryGrid) return;

    // A. Draw Bounding Box of Exploration Area
    const boundsPoly = L.rectangle(
      [
        [KRAKOW_GRID_CONFIG.LAT_MIN, KRAKOW_GRID_CONFIG.LNG_MIN],
        [KRAKOW_GRID_CONFIG.LAT_MAX, KRAKOW_GRID_CONFIG.LNG_MAX],
      ],
      {
        color: '#6366f1',
        weight: 2,
        dashArray: '6, 6',
        fill: false,
        interactive: false,
      }
    );
    boundsPoly.addTo(discoveryLayer);

    const discoveredSet = new Set(discoveredTileIds);

    // B. Draw Undiscovered Tiles (Fog of War)
    // Discovered tiles disappear (fog is lifted, revealing the map underneath)
    for (let y = 0; y < KRAKOW_GRID_CONFIG.ROWS; y++) {
      for (let x = 0; x < KRAKOW_GRID_CONFIG.COLS; x++) {
        const tileId = `${x}_${y}`;
        if (discoveredSet.has(tileId)) {
          // Odkryty kafelek -> mgła znika (kafelek znika z mapy)
          continue;
        }

        const bounds = tileToBounds(x, y);
        const rect = L.rectangle(bounds, {
          color: '#64748b',       // Elegancka, subtelna ramka
          weight: 1,              // Cienka linia
          opacity: 0.25,          // Zwiększona przezroczystość obramówki
          fillColor: '#475569',   // Mgła wojny
          fillOpacity: 0.22,      // Półprzezroczysta mgła odsłaniająca zarys ulic
          interactive: true,
        });

        rect.bindTooltip(
          `<div style="font-size:12px;font-weight:600;color:#1e293b;">🌫️ Kafel nieodkryty (Mgła)</div><div style="font-size:10px;color:#64748b;">Przejdź tędy lub włącz lokalizację na żywo • ID: ${tileId}</div>`,
          { sticky: true }
        );

        rect.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (onTileClickRef.current) {
            onTileClickRef.current(tileId);
          }
        });

        rect.addTo(discoveryLayer);
      }
    }
  }, [showDiscoveryGrid, discoveredTileIds, auditedTileIds]);

  // 4. Update Current User GPS Location Layer
  useEffect(() => {
    const layer = userGpsLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (!currentGpsCoords) return;

    const userGpsIcon = L.divIcon({
      className: 'custom-user-gps-marker',
      html: `
        <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:24px;height:24px;background-color:#0284c7;opacity:0.4;border-radius:50%;animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width:14px;height:14px;background-color:#0284c7;border:2.5px solid white;border-radius:50%;box-shadow:0 0 8px rgba(2,132,199,0.9);z-index:2;"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([currentGpsCoords.lat, currentGpsCoords.lng], {
      icon: userGpsIcon,
      zIndexOffset: 1000,
      title: 'Twoja aktualna pozycja GPS',
    }).bindPopup('<strong>Twoja pozycja GPS (na żywo)</strong>');

    marker.addTo(layer);
  }, [currentGpsCoords]);

  // 5. Auto-center map on user GPS location when triggered (e.g. upon enabling Live Location mode)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentGpsCoords || !centerOnGpsTrigger) return;

    try {
      map.setView([currentGpsCoords.lat, currentGpsCoords.lng], 16, { animate: false });
    } catch (err) {
      console.warn('Auto-center on GPS warning:', err);
    }
  }, [centerOnGpsTrigger, currentGpsCoords]);

  const handleRecenterOnGps = () => {
    const map = mapInstanceRef.current;
    if (!map || !currentGpsCoords) return;
    try {
      map.setView([currentGpsCoords.lat, currentGpsCoords.lng], 16, { animate: false });
    } catch (err) {
      console.warn('Recenter GPS error:', err);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[450px]">
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[450px] rounded-lg shadow-inner z-0"
        role="application"
        aria-label="Interaktywna mapa Krakowa z trasą i barierami architektonicznymi"
      />

      {/* Floating GPS Recenter Button when live coordinates are available */}
      {currentGpsCoords && (
        <button
          type="button"
          onClick={handleRecenterOnGps}
          title="Wyśrodkuj widok na mojej lokalizacji GPS"
          className="absolute top-3 right-3 z-10 px-3 py-2 bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-transform active:scale-95 cursor-pointer flex items-center gap-2 text-xs font-bold"
        >
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          <span>Moja lokalizacja</span>
        </button>
      )}
    </div>
  );
}
