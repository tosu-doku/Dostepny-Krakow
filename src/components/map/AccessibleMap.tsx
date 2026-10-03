'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Barrier } from '@/types/barrier';

interface AccessibleMapProps {
  start?: { lat: number; lng: number } | null;
  end?: { lat: number; lng: number } | null;
  routeCoordinates?: [number, number][]; // [[lng, lat], ...]
  barriers?: Barrier[];
  selectedLocation?: { lat: number; lng: number } | null;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  onSelectBarrier?: (barrier: Barrier) => void;
}

export default function AccessibleMap({
  start,
  end,
  routeCoordinates = [],
  barriers = [],
  selectedLocation,
  onMapClick,
  onSelectBarrier,
}: AccessibleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Dedicated layer groups for clean, crash-free Leaflet updates
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const prevRouteKeyRef = useRef<string>('');

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Krakow (Rynek Główny)
    const map = L.map(mapContainerRef.current, {
      center: [50.0614, 19.9365],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Create persistent layer groups
    routeLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
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
        map.remove();
      } catch {
        // Safe cleanup
      }
      mapInstanceRef.current = null;
    };
  }, [onMapClick]);

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

      if (onSelectBarrier) {
        marker.on('click', () => onSelectBarrier(b));
      }

      marker.addTo(markersLayer);
    });

    // Auto-fit bounds only when route coordinates key changes
    const currentRouteKey = routeCoordinates.length > 0
      ? `${routeCoordinates[0][0]},${routeCoordinates[0][1]}-${routeCoordinates[routeCoordinates.length - 1][0]}`
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
  }, [start, end, routeCoordinates, barriers, selectedLocation, onSelectBarrier]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[450px] rounded-lg shadow-inner z-0"
      role="application"
      aria-label="Interaktywna mapa Krakowa z trasą i barierami architektonicznymi"
    />
  );
}
