import L from 'leaflet';
import { Barrier } from '@/types/barrier';

/**
 * Creates custom icon for Start Marker (A).
 */
export function createStartIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-start-marker',
    html: `<div style="background-color:#16a34a;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.4);">A</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

/**
 * Creates custom icon for End / Destination Marker (B).
 */
export function createEndIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-end-marker',
    html: `<div style="background-color:#dc2626;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.4);">B</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

/**
 * Creates custom icon for user-picked location on the map.
 */
export function createPickedIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-picked-marker',
    html: `<div style="background-color:#9333ea;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 0 10px rgba(147,51,234,0.7);">📍</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

/**
 * Creates animated pulsing custom icon for user live GPS position.
 */
export function createUserGpsIcon(): L.DivIcon {
  return L.divIcon({
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
}

/**
 * Creates custom marker icon for an architectural barrier based on its type.
 */
export function createBarrierIcon(barrier: Barrier): L.DivIcon {
  const isStairs = barrier.barrier_type === 'STAIRS';
  const bgColor = isStairs ? '#b91c1c' : '#d97706';
  const symbol = isStairs ? '🪜' : '⚠️';

  return L.divIcon({
    className: 'custom-barrier-marker',
    html: `<div style="background-color:${bgColor};color:white;width:30px;height:30px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);" title="${barrier.barrier_type}">${symbol}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/**
 * Builds HTML popup markup for an architectural barrier.
 */
export function createBarrierPopupHtml(barrier: Barrier): string {
  const detailsStr = Object.entries(barrier.details || {})
    .filter(([k]) => k !== 'images' && k !== 'original_links')
    .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
    .join('');

  const hasImages =
    (barrier.details?.images &&
      Array.isArray(barrier.details.images) &&
      barrier.details.images.length > 0) ||
    !!barrier.image_url;
  const photoBadge = hasImages
    ? '<div style="margin-top:4px;color:#2563eb;font-weight:bold;font-size:11px;">📷 Dostępne zdjęcia w panelu</div>'
    : '';

  return `
    <div style="min-width: 200px; font-family: sans-serif; font-size: 13px;">
      <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #111;">
        ${barrier.barrier_type}
      </h3>
      <p style="margin: 0 0 6px 0; color: #444;">${barrier.address_description || 'Brak opisu adresu'}</p>
      <ul style="margin: 0 0 6px 0; padding-left: 16px; color: #333;">
        ${detailsStr}
      </ul>
      ${photoBadge}
      <div style="font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 4px; margin-top: 4px;">
        <div><strong>Źródło:</strong> ${barrier.source}</div>
        <div><strong>Wiarygodność:</strong> ${(barrier.confidence_score * 100).toFixed(0)}% (${barrier.status})</div>
      </div>
    </div>
  `;
}
