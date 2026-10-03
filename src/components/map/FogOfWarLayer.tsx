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

    // 2. Draw Undiscovered Tiles (Fog of War)
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
          color: '#64748b',
          weight: 1,
          opacity: 0.25, // Zwiększona przezroczystość obramówki
          fillColor: '#475569',
          fillOpacity: 0.22,
          interactive: true,
        });

        rect.bindTooltip(
          `<div style="font-size:11px; font-weight:bold; color:#334155;">🌫️ Kafel nieodkryty #${tileId}</div><div style="font-size:10px; color:#64748b;">Przejdź tędy lub włącz GPS, aby odkryć</div>`,
          {
            sticky: true,
            className: 'discovery-tile-tooltip',
          }
        );

        if (onTileClick) {
          rect.on('click', () => onTileClick(tileId));
        }

        layer.addLayer(rect);
      }
    }

    return () => {
      layer.clearLayers();
    };
  }, [map, enabled, discoveredTileIds, auditedTileIds, onTileClick]);

  return null;
}
