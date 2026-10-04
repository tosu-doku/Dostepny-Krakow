'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, Minus, LocateFixed, Layers } from 'lucide-react';
import { Barrier } from '@/types/barrier';
import { DailyQuest } from '@/types/gamification';
import { KRAKOW_GRID_CONFIG, getAllKrakowCells, getCellBoundary, routeToTiles } from '@/services/grid';
import {
  createStartIcon,
  createEndIcon,
  createPickedIcon,
  createUserGpsIcon,
  createBarrierIcon,
  createBarrierPopupHtml,
  createQuestMarkerIcon,
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
  isLiveLocationActive?: boolean;
  /** When set, renders a prominent magenta quest marker at the quest's coordinates */
  activeQuest?: DailyQuest | null;
  /** Called when the user taps the quest marker */
  onSelectQuest?: (quest: DailyQuest) => void;
  /** Controls visibility of historic cobblestone street and plaza surfaces overlay */
  showSurfacesLayer?: boolean;
  startName?: string;
  endName?: string;
  focusedBarrier?: Barrier | null;
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
  isLiveLocationActive = false,
  activeQuest = null,
  onSelectQuest,
  showSurfacesLayer = true,
  startName,
  endName,
  focusedBarrier = null,
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

  const onSelectQuestRef = useRef(onSelectQuest);
  useEffect(() => {
    onSelectQuestRef.current = onSelectQuest;
  }, [onSelectQuest]);

  // Dedicated layer groups for clean, crash-free Leaflet updates
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const discoveryLayerRef = useRef<L.LayerGroup | null>(null);
  const userGpsLayerRef = useRef<L.LayerGroup | null>(null);
  const questLayerRef = useRef<L.LayerGroup | null>(null);
  const surfacesLayerRef = useRef<L.GeoJSON | null>(null);
  const surfacesDataRef = useRef<any>(null);
  const prevRouteKeyRef = useRef<string>('');
  const barrierMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  const [showSurfaces, setShowSurfaces] = useState<boolean>(showSurfacesLayer);

  useEffect(() => {
    setShowSurfaces(showSurfacesLayer);
  }, [showSurfacesLayer]);

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
      zoomControl: false, // Disabled default top-left control in favor of thumb-accessible controls
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
    // Surfaces layer on bottom so route and markers are drawn on top
    surfacesLayerRef.current = L.geoJSON(null, {
      style: (feature) => {
        const isPolygon = feature?.geometry?.type === 'Polygon' || feature?.geometry?.type === 'MultiPolygon';
        const surface = feature?.properties?.surface || 'sett';
        const isSett = surface === 'sett';
        return isPolygon
          ? {
              color: isSett ? '#b45309' : '#9a3412',
              weight: 1.5,
              dashArray: '3, 4',
              fillColor: isSett ? '#d97706' : '#c2410c',
              fillOpacity: 0.32,
            }
          : {
              color: isSett ? '#d97706' : '#ea580c',
              weight: 5,
              opacity: 0.70,
              dashArray: '4, 6',
              lineCap: 'round',
              lineJoin: 'round',
            };
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        const surfaceName =
          p.surface === 'sett'
            ? 'Kostka rzędowa'
            : p.surface === 'cobblestone'
            ? 'Kocie łby'
            : 'Kamień polny';

        layer.bindPopup(`
          <div style="font-family: inherit; font-size: 13px; line-height: 1.4; min-width: 150px;">
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
              ${p.name || surfaceName}
            </div>
            <div style="font-size: 12px; color: #b45309; font-weight: 700;">
              ${surfaceName}
            </div>
            <div style="margin-top: 4px; font-size: 11px; color: #64748b;">
              ⚠️ Utrudnienie dla wózków
            </div>
          </div>
        `);
      },
    }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    discoveryLayerRef.current = L.layerGroup().addTo(map);
    userGpsLayerRef.current = L.layerGroup().addTo(map);
    questLayerRef.current = L.layerGroup().addTo(map);

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
    barrierMarkersRef.current.clear();

    // Draw Route Polyline
    let newBounds: L.LatLngBounds | null = null;
    if (routeCoordinates && routeCoordinates.length > 0) {
      const latLngs: [number, number][] = routeCoordinates.map(([lng, lat]) => [lat, lng]);
      const polyline = L.polyline(latLngs, {
        color: '#7c3aed',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      });
      polyline.addTo(routeLayer);
      newBounds = polyline.getBounds();
    }

    // Add Start Marker (A)
    if (start) {
      L.marker([start.lat, start.lng], { icon: createStartIcon(), title: `Start (A): ${startName || 'Punkt startowy'}` })
        .addTo(markersLayer)
        .bindPopup(
          `<div style="font-family:inherit;font-size:13px;line-height:1.4;">
            <div style="font-size:10px;font-weight:800;color:#0284c7;text-transform:uppercase;">Punkt startowy (A)</div>
            <div style="font-size:14px;font-weight:800;color:#0f172a;margin-top:2px;">${startName || 'Początek trasy'}</div>
          </div>`
        );
    }

    // Add End Marker (B)
    if (end) {
      L.marker([end.lat, end.lng], { icon: createEndIcon(), title: `Cel (B): ${endName || 'Punkt docelowy'}` })
        .addTo(markersLayer)
        .bindPopup(
          `<div style="font-family:inherit;font-size:13px;line-height:1.4;">
            <div style="font-size:10px;font-weight:800;color:#dc2626;text-transform:uppercase;">Punkt docelowy (B)</div>
            <div style="font-size:14px;font-weight:800;color:#0f172a;margin-top:2px;">${endName || 'Cel trasy'}</div>
          </div>`
        );
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

    // Add Barrier Markers (warning widgets appear only on route after it has been calculated)
    const hasRoute = routeCoordinates && routeCoordinates.length > 0;
    if (hasRoute && barriers && barriers.length > 0) {
      // Anti-clutter filter: prevent overlapping pills of same type or multiple cobblestone pills close together
      const placedMarkers: { lat: number; lng: number; type: string }[] = [];

      barriers.forEach((b) => {
        const isCobble = b.barrier_type === 'COBBLESTONE_SURFACE';
        const minDistanceDeg = isCobble ? 0.0018 : 0.0006; // ~180m for cobblestone, ~60m for stairs/kerbs

        const isTooClose = placedMarkers.some((m) => {
          const latDiff = Math.abs(m.lat - b.latitude);
          const lngDiff = Math.abs(m.lng - b.longitude);

          // For same barrier type, ensure comfortable spacing along route
          if (m.type === b.barrier_type && latDiff < minDistanceDeg && lngDiff < minDistanceDeg) {
            return true;
          }

          // For any barrier type, avoid stacking directly on top of each other (< 30m)
          if (latDiff < 0.0003 && lngDiff < 0.0003) {
            return true;
          }

          return false;
        });

        // Also avoid rendering directly on top of Destination (B) or Start (A) marker (< 20m)
        const overlapsEnd =
          end && Math.abs(end.lat - b.latitude) < 0.0002 && Math.abs(end.lng - b.longitude) < 0.0002;
        const overlapsStart =
          start && Math.abs(start.lat - b.latitude) < 0.0002 && Math.abs(start.lng - b.longitude) < 0.0002;

        if (isTooClose || overlapsEnd || overlapsStart) return;

        placedMarkers.push({ lat: b.latitude, lng: b.longitude, type: b.barrier_type });

        const marker = L.marker([b.latitude, b.longitude], {
          icon: createBarrierIcon(b),
          title: `Bariera: ${b.barrier_type} (${b.address_description || ''})`,
          zIndexOffset: isCobble ? 500 : 1000,
        }).bindPopup(createBarrierPopupHtml(b));

        marker.on('click', () => {
          if (onSelectBarrierRef.current) {
            onSelectBarrierRef.current(b);
          }
        });

        if (b.id) {
          barrierMarkersRef.current.set(b.id, marker);
        }

        marker.addTo(markersLayer);
      });
    }

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
  }, [start, end, routeCoordinates, barriers, selectedLocation, startName, endName]);

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
    const allCells = getAllKrakowCells();

    // Calculate cells that intersect the planned route
    const routeHexIds = new Set(
      routeCoordinates && routeCoordinates.length > 0
        ? routeToTiles(routeCoordinates)
        : []
    );

    // B. Draw Undiscovered Hexagonal Tiles (Uber H3 Fog of War)
    // Discovered tiles disappear (fog is lifted, revealing the map underneath)
    for (const cellId of allCells) {
      if (discoveredSet.has(cellId)) {
        // Odkryty heksagon -> mgła znika (kafelek znika z mapy)
        continue;
      }

      const boundary = getCellBoundary(cellId);
      if (boundary.length === 0) continue;

      // Attachment 1: When route is active and live location is on, color route hexagons light green
      const isRouteHex = isLiveLocationActive && routeHexIds.has(cellId);

      const hex = L.polygon(boundary, {
        color: isRouteHex ? '#059669' : '#64748b',       // Zielona ramka na trasie, grafitowa poza
        weight: isRouteHex ? 1.5 : 1,                     // Wyraźniejszy kontur dla heksagonów trasy
        opacity: isRouteHex ? 0.85 : 0.25,
        fillColor: isRouteHex ? '#34d399' : '#475569',   // Jasnozielony kolor heksagonu na trasie (Załącznik 1)
        fillOpacity: isRouteHex ? 0.35 : 0.22,           // Przezroczyste wypełnienie
        interactive: false,                               // Wyłącz interaktywność: brak tooltipów, brak zaznaczania
      });

      hex.addTo(discoveryLayer);
    }
  }, [showDiscoveryGrid, discoveredTileIds, auditedTileIds, routeCoordinates, isLiveLocationActive]);

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

  // 6. Render Daily Quest Marker (visible only when exploration mode is enabled & activeQuest is set)
  useEffect(() => {
    const layer = questLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (!activeQuest?.coordinates) return;

    const xpReward = activeQuest.baseXp * activeQuest.multiplier;
    const marker = L.marker(
      [activeQuest.coordinates.lat, activeQuest.coordinates.lng],
      {
        icon: createQuestMarkerIcon(xpReward),
        zIndexOffset: 2000,
        title: `Misja: ${activeQuest.title}`,
      }
    ).bindPopup(
      `<div style="font-family:sans-serif;min-width:180px;">
        <div style="color:#d90479;font-weight:900;font-size:13px;margin-bottom:4px;">🎯 Misja Dnia</div>
        <div style="font-weight:bold;font-size:13px;color:#111;margin-bottom:2px;">${activeQuest.title}</div>
        <div style="font-size:11px;color:#555;">${activeQuest.subtitle}</div>
        <div style="margin-top:6px;background:#fff1f7;border:1px solid #fecdd3;border-radius:8px;padding:6px 8px;font-size:12px;font-weight:700;color:#d90479;">+${xpReward} XP • ${activeQuest.multiplier}x Multiplier</div>
        <div style="margin-top:6px;font-size:11px;color:#d90479;font-weight:700;cursor:pointer;" onclick="this.closest('.leaflet-popup').dispatchEvent(new Event('questclick',{bubbles:true}))">Kliknij znacznik, aby zobaczyć szczegóły →</div>
      </div>`
    );

    marker.on('click', () => {
      if (onSelectQuestRef.current) {
        onSelectQuestRef.current(activeQuest);
      }
    });

    marker.addTo(layer);
  }, [activeQuest]);

  // 7. Load and populate cobblestone surfaces GeoJSON
  useEffect(() => {
    let isCancelled = false;
    async function loadSurfaces() {
      if (surfacesDataRef.current) {
        if (surfacesLayerRef.current && surfacesLayerRef.current.getLayers().length === 0) {
          surfacesLayerRef.current.addData(surfacesDataRef.current);
        }
        return;
      }
      try {
        const res = await fetch('/api/surfaces');
        if (res.ok) {
          const geojson = await res.json();
          if (!isCancelled) {
            surfacesDataRef.current = geojson;
            if (surfacesLayerRef.current) {
              surfacesLayerRef.current.addData(geojson);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load surfaces GeoJSON:', err);
      }
    }
    loadSurfaces();
    return () => {
      isCancelled = true;
    };
  }, []);

  // 8. Toggle cobblestone surfaces layer visibility on map
  useEffect(() => {
    const layer = surfacesLayerRef.current;
    const map = mapInstanceRef.current;
    if (!layer || !map) return;

    if (showSurfaces) {
      if (!map.hasLayer(layer)) {
        map.addLayer(layer);
      }
    } else {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    }
  }, [showSurfaces]);

  // 9. Focus on selected barrier when triggered from timeline
  useEffect(() => {
    if (!focusedBarrier || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
        map.setView([focusedBarrier.latitude, focusedBarrier.longitude], 18, { animate: false });

        const marker = focusedBarrier.id ? barrierMarkersRef.current.get(focusedBarrier.id) : null;
        if (marker) {
          marker.openPopup();
        } else {
          L.popup()
            .setLatLng([focusedBarrier.latitude, focusedBarrier.longitude])
            .setContent(createBarrierPopupHtml(focusedBarrier))
            .openOn(map);
        }
      } catch (err) {
        console.warn('Error focusing on barrier:', err);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [focusedBarrier]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      if (currentGpsCoords) {
        map.setView([currentGpsCoords.lat, currentGpsCoords.lng], 16, { animate: false });
      } else {
        map.setView([50.0614, 19.9365], 14, { animate: false });
      }
    } catch (err) {
      console.warn('Recenter map error:', err);
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

      {/* Floating Accessible Map Controls (Right Side - Thumb Ergonomics & WCAG 44x44px target) */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[400] flex flex-col gap-2 pointer-events-auto">
        {/* Zoom In & Zoom Out Stack */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 flex flex-col overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Przybliż mapę"
            title="Przybliż mapę (+)"
            className="w-11 h-11 flex items-center justify-center text-slate-800 hover:text-purple-600 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer border-b border-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-600/40"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Oddal mapę"
            title="Oddal mapę (-)"
            className="w-11 h-11 flex items-center justify-center text-slate-800 hover:text-purple-600 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-600/40"
          >
            <Minus className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
          </button>
        </div>

        {/* Center / Locate Button */}
        <button
          type="button"
          onClick={handleRecenter}
          aria-label={currentGpsCoords ? "Wycentruj na Twojej pozycji GPS" : "Wycentruj na Rynku Głównym w Krakowie"}
          title={currentGpsCoords ? "Moja lokalizacja GPS" : "Centrum Krakowa (Rynek)"}
          className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 flex items-center justify-center text-slate-800 hover:text-purple-600 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-600/40 relative"
        >
          <LocateFixed className={`w-5 h-5 ${currentGpsCoords ? 'text-blue-600' : 'text-slate-700'}`} aria-hidden="true" />
          {currentGpsCoords && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          )}
        </button>

        {/* Toggle Cobblestone Surfaces Layer Button */}
        <button
          type="button"
          onClick={() => setShowSurfaces((prev) => !prev)}
          aria-label={showSurfaces ? 'Ukryj obszary brukowane na mapie' : 'Pokaż obszary brukowane na mapie'}
          title={showSurfaces ? 'Nawierzchnie z bruku: Włączone' : 'Nawierzchnie z bruku: Wyłączone'}
          className={`w-11 h-11 backdrop-blur-md rounded-2xl shadow-xl border flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/40 relative ${
            showSurfaces
              ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/25 ring-2 ring-amber-400/40'
              : 'bg-white/95 text-slate-700 border-slate-200/90 hover:text-amber-600 hover:bg-slate-50 active:bg-slate-100'
          }`}
        >
          <Layers className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
