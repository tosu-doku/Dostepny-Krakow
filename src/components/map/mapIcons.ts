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
 * Creates pill-style badge icon for obstacles/features directly on the map (Attachment 1).
 */
export function createBarrierPillIcon(barrier: Barrier): L.DivIcon {
  const isStairs = barrier.barrier_type === 'STAIRS';
  const isKerb = barrier.barrier_type === 'HIGH_KERB';
  const isRamp = barrier.details?.has_ramp === true || barrier.barrier_type === 'STEEP_INCLINE';

  let bg = '#f59e0b';
  let text = '#0f172a';
  let icon = '⚠️';
  let label = barrier.address_description?.slice(0, 18) || barrier.barrier_type;

  if (isRamp) {
    bg = '#16a34a';
    text = '#ffffff';
    icon = '✓';
    label = 'Podjazd';
  } else if (isKerb) {
    bg = '#facc15';
    text = '#0f172a';
    icon = '⚠️';
    const height = barrier.details?.height_cm ? `${barrier.details.height_cm} cm` : '';
    label = `Krawężnik ${height}`.trim();
  } else if (isStairs) {
    bg = '#f59e0b';
    text = '#0f172a';
    icon = '⚠️';
    const steps = barrier.details?.step_count ? `${barrier.details.step_count} st.` : 'Schody';
    label = steps;
  }

  return L.divIcon({
    className: 'custom-barrier-pill',
    html: `
      <div style="
        display:inline-flex;
        align-items:center;
        gap:5px;
        background-color:${bg};
        color:${text};
        font-size:11px;
        font-weight:700;
        padding:4px 10px;
        border-radius:9999px;
        white-space:nowrap;
        box-shadow:0 3px 8px rgba(0,0,0,0.18);
        border:1.5px solid rgba(255,255,255,0.9);
        pointer-events:auto;
        cursor:pointer;
        transform:translate(-50%, -50%);
      ">
        <span style="font-size:12px;">${icon}</span>
        <span>${label}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/**
 * Creates custom marker icon for an architectural barrier based on its type.
 */
export function createBarrierIcon(barrier: Barrier): L.DivIcon {
  return createBarrierPillIcon(barrier);
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

/**
 * Creates a vibrant magenta quest marker icon for the daily quest location on the map.
 * Shows a pulsing ring + camera icon + "+XP" chip.
 */
export function createQuestMarkerIcon(xpReward: number = 200): L.DivIcon {
  return L.divIcon({
    className: 'custom-quest-marker',
    html: `
      <div style="position:relative;width:48px;height:56px;display:flex;flex-direction:column;align-items:center;">
        <!-- Pulse ring -->
        <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:48px;height:48px;background-color:#d90479;opacity:0.25;border-radius:50%;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <!-- Main badge -->
        <div style="position:relative;width:40px;height:40px;background-color:#d90479;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(217,4,121,0.55);z-index:2;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <!-- XP chip below badge -->
        <div style="margin-top:2px;background-color:#d90479;color:white;font-size:9px;font-weight:900;padding:2px 6px;border-radius:9999px;white-space:nowrap;box-shadow:0 2px 6px rgba(217,4,121,0.4);border:1.5px solid white;z-index:2;">+${xpReward} XP</div>
      </div>
    `,
    iconSize: [48, 56],
    iconAnchor: [24, 48],
    popupAnchor: [0, -52],
  });
}
