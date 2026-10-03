'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  KRAKOW_GRID_CONFIG,
  parseTileId,
  tileToBounds,
} from '@/services/grid';

interface FogOfWarLayerProps {
  map: L.Map | null;
  enabled: boolean;
  discoveredTileIds: string[];
  auditedTileIds: string[];
  onTileClick?: (tileId: string) => void;
}

export default function FogOfWarLayer({
  map,
  enabled,
  discoveredTileIds,
  auditedTileIds,
  onTileClick,
}: FogOfWarLayerProps) {
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const layer = layerGroupRef.current;
    layer.clearLayers();

    if (!enabled) return;

    const auditedSet = new Set(auditedTileIds);
    const discoveredSet = new Set(discoveredTileIds);

    // 1. Draw Bounding Box of the whole exploration zone
    const zoneBounds: [[number, number], [number, number]] = [
      [KRAKOW_GRID_CONFIG.LAT_MIN, KRAKOW_GRID_CONFIG.LNG_MIN],
      [KRAKOW_GRID_CONFIG.LAT_MAX, KRAKOW_GRID_CONFIG.LNG_MAX],
    ];

    const boundaryRect = L.rectangle(zoneBounds, {
      color: '#6366f1',
      weight: 2,
      dashArray: '6, 6',
      fill: false,
      interactive: false,
    });
    boundaryRect.bindTooltip('Strefa Odkrywania Krakowa (Siatka 100m x 100m)', {
      permanent: false,
      direction: 'top',
    });
    layer.addLayer(boundaryRect);

    // 2. Draw Discovered & Audited Tiles
    for (const tileId of discoveredSet) {
      const parsed = parseTileId(tileId);
      if (!parsed) continue;

      const bounds = tileToBounds(parsed.x, parsed.y);
      const isAudited = auditedSet.has(tileId);

      const rect = L.rectangle(bounds, {
        color: isAudited ? '#d97706' : '#0284c7', // Gold vs Cyan
        weight: isAudited ? 2 : 1.5,
        fillColor: isAudited ? '#fbbf24' : '#38bdf8',
        fillOpacity: isAudited ? 0.38 : 0.22,
        interactive: true,
      });

      const tooltipContent = isAudited
        ? `<div style="font-size:11px; font-weight:bold; color:#b45309;">📸 Złoty Kafelek #${tileId}</div><div style="font-size:10px; color:#444;">Zaudytowany ze zdjęciem przeszkody (+100 XP)</div>`
        : `<div style="font-size:11px; font-weight:bold; color:#0369a1;">🟦 Odkryty Kafelek #${tileId}</div><div style="font-size:10px; color:#444;">Odwiedzony obszar (+10 XP)</div>`;

      rect.bindTooltip(tooltipContent, {
        sticky: true,
        className: 'discovery-tile-tooltip',
      });

      if (onTileClick) {
        rect.on('click', () => onTileClick(tileId));
      }

      layer.addLayer(rect);
    }

    return () => {
      layer.clearLayers();
    };
  }, [map, enabled, discoveredTileIds, auditedTileIds, onTileClick]);

  return null;
}
