'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Barrier } from '@/types/barrier';
import { KRAKOW_GRID_CONFIG, parseTileId, tileToBounds } from '@/services/grid';
import {
  createStartIcon,
  createEndIcon,
  createPickedIcon,
  createUserGpsIcon,
  createBarrierIcon,
  createBarrierPopupHtml,
} from './mapIcons';

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
      L.marker([start.lat, start.lng], { icon: createStartIcon(), title: 'Punkt Startowy (A)' })
        .addTo(markersLayer)
        .bindPopup('<strong>Punkt startowy (A)</strong>');
    }

    // Add End Marker (B)
    if (end) {
      L.marker([end.lat, end.lng], { icon: createEndIcon(), title: 'Punkt Docelowy (B)' })
        .addTo(markersLayer)
        .bindPopup('<strong>Punkt docelowy (B)</strong>');
    }

    // Add Selected / Picked Marker
    if (selectedLocation) {
      L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: createPickedIcon(),
        title: 'Wybrana lokalizacja',
      })
        .addTo(markersLayer)
        .bindPopup('<strong>Wybrany punkt na mapie</strong>');
    }

    // Add Barrier Markers
    barriers.forEach((b) => {
      const marker = L.marker([b.latitude, b.longitude], {
        icon: createBarrierIcon(b),
        title: `Bariera: ${b.barrier_type} (${b.address_description || ''})`,
      }).bindPopup(createBarrierPopupHtml(b));

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

    const marker = L.marker([currentGpsCoords.lat, currentGpsCoords.lng], {
      icon: createUserGpsIcon(),
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
