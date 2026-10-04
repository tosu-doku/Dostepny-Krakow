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
  const isCobblestone = barrier.barrier_type === 'COBBLESTONE_SURFACE';
  const isRamp = barrier.details?.has_ramp === true || barrier.barrier_type === 'STEEP_INCLINE';

  let bg = '#f59e0b';
  let text = '#0f172a';
  let icon = '⚠️';
  let label = barrier.address_description?.slice(0, 24) || barrier.barrier_type;

  if (isCobblestone) {
    bg = '#d97706';
    text = '#ffffff';
    icon = '🏛️';
    const sType = barrier.details?.surface || 'bruk';
    label = barrier.details?.name ? `${barrier.details.name} (${sType})` : `Bruk (${sType})`;
  } else if (isRamp) {
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
    bg = '#ea580c';
    text = '#ffffff';
    icon = '⚠️';
    const steps = barrier.details?.step_count ? `${barrier.details.step_count} st.` : 'Schody';
    label = barrier.details?.has_ramp ? `${steps} (rampa)` : steps;
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
        font-weight:800;
        padding:4px 10px;
        border-radius:9999px;
        white-space:nowrap;
        box-shadow:0 3px 8px rgba(0,0,0,0.22);
        border:1.5px solid rgba(255,255,255,0.95);
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
 * Builds HTML popup markup for an architectural barrier displaying all rich GeoJSON parameters.
 */
export function createBarrierPopupHtml(barrier: Barrier): string {
  const isStairs = barrier.barrier_type === 'STAIRS';
  const isCobblestone = barrier.barrier_type === 'COBBLESTONE_SURFACE';
  const isKerb = barrier.barrier_type === 'HIGH_KERB';

  let titleBadge = '⚠️ Utrudnienie architektoniczne';
  let titleColor = '#d97706';
  let badgeBg = '#fef3c7';

  if (isStairs) {
    titleBadge = '🪜 Schody terenowe';
    titleColor = '#ea580c';
    badgeBg = '#ffedd5';
  } else if (isCobblestone) {
    titleBadge = '🏛️ Nawierzchnia z kostki brukowej';
    titleColor = '#b45309';
    badgeBg = '#fef3c7';
  } else if (isKerb) {
    titleBadge = '⚠️ Wysoki krawężnik';
    titleColor = '#ca8a04';
    badgeBg = '#fef9c3';
  }

  const items: string[] = [];

  if (isStairs) {
    if (barrier.details?.step_count) {
      items.push(`<li><strong>Liczba stopni:</strong> ${barrier.details.step_count} st.</li>`);
    }
    items.push(
      `<li><strong>Podjazd dla wózków:</strong> ${
        barrier.details?.has_ramp
          ? '<span style="color:#16a34a;font-weight:bold;">✓ Dostępny (' + (barrier.details.ramp_type || 'rampa') + ')</span>'
          : '<span style="color:#dc2626;font-weight:bold;">✗ Brak podjazdu</span>'
      }</li>`
    );
    items.push(
      `<li><strong>Poręcz:</strong> ${
        barrier.details?.has_handrail
          ? '<span style="color:#16a34a;font-weight:bold;">✓ Zamontowana</span>'
          : '<span style="color:#64748b;">✗ Brak poręczy</span>'
      }</li>`
    );
    items.push(
      `<li><strong>Płyty dotykowe (niewidomi):</strong> ${
        barrier.details?.tactile_paving
          ? '<span style="color:#16a34a;font-weight:bold;">✓ Oznaczenia fakturowe</span>'
          : '<span style="color:#64748b;">✗ Brak oznaczeń</span>'
      }</li>`
    );
    if (barrier.details?.surface) {
      items.push(`<li><strong>Nawierzchnia schodów:</strong> ${barrier.details.surface}</li>`);
    }
    if (barrier.details?.incline) {
      items.push(`<li><strong>Kierunek:</strong> ${barrier.details.incline}</li>`);
    }
    if (barrier.details?.width) {
      items.push(`<li><strong>Szerokość:</strong> ${barrier.details.width} m</li>`);
    }
  } else if (isCobblestone) {
    items.push(`<li><strong>Rodzaj bruku:</strong> ${barrier.details?.surface_label || barrier.details?.surface || 'Kostka brukowa'}</li>`);
    if (barrier.details?.smoothness) {
      items.push(`<li><strong>Gładkość nawierzchni:</strong> ${barrier.details.smoothness}</li>`);
    }
    items.push(`<li><strong>Wpływ na mobilność:</strong> <span style="color:#b45309;font-weight:bold;">Silne drgania dla wózków inwalidzkich i dziecięcych</span></li>`);
    if (barrier.details?.highway) {
      items.push(`<li><strong>Klasa drogi:</strong> ${barrier.details.highway}</li>`);
    }
  } else {
    Object.entries(barrier.details || {})
      .filter(([k]) => k !== 'images' && k !== 'original_links' && k !== 'geometry')
      .forEach(([k, v]) => items.push(`<li><strong>${k}:</strong> ${v}</li>`));
  }

  const hasImages =
    (barrier.details?.images &&
      Array.isArray(barrier.details.images) &&
      barrier.details.images.length > 0) ||
    !!barrier.image_url;
  const photoBadge = hasImages
    ? '<div style="margin-top:6px;color:#2563eb;font-weight:bold;font-size:11px;">📷 Dostępne zdjęcia w panelu</div>'
    : '';

  const sourceLabel = barrier.source === 'OSM' ? 'OpenStreetMap (dane miejskie Krakowa)' : barrier.source;

  return `
    <div style="min-width: 230px; font-family: sans-serif; font-size: 13px; line-height: 1.4;">
      <div style="display:inline-block; font-size:11px; font-weight:800; color:${titleColor}; background:${badgeBg}; padding:2px 8px; border-radius:9999px; margin-bottom:4px;">
        ${titleBadge}
      </div>
      <h3 style="margin: 2px 0 6px 0; font-size: 14px; font-weight: 800; color: #0f172a;">
        ${barrier.address_description || 'Utrudnienie w Krakowie'}
      </h3>
      <ul style="margin: 0 0 6px 0; padding-left: 18px; color: #334155; font-size: 12px;">
        ${items.join('')}
      </ul>
      ${photoBadge}
      <div style="font-size: 11px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 6px; margin-top: 6px; display:flex; flex-direction:column; gap:2px;">
        <div><strong>Źródło:</strong> ${sourceLabel}</div>
        <div><strong>Wiarygodność:</strong> ${(barrier.confidence_score * 100).toFixed(0)}% (${barrier.status})</div>
        ${barrier.details?.osm_id ? `<div style="color:#94a3b8;font-size:10px;">OSM: ${barrier.details.osm_id}</div>` : ''}
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
