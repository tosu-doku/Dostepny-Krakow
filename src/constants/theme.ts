/**
 * Design tokens and theme constants for Krakow Bez Barier (Mobile-First Light Theme).
 * Matches visual attachments:
 * - Attachment 1: Light green route hexagons, map floating pills, magenta CTA, purple active tab.
 * - Attachment 2: Dark slate turn banner, floating stats cards, route confidence timeline.
 * - Attachment 3: Deep plum title, pill search inputs, accessibility filter button.
 */

export const APP_THEME = {
  colors: {
    // Backgrounds & Surfaces
    background: '#ffffff',
    surface: '#ffffff',
    surfaceSubtle: '#f8fafc',
    surfaceMuted: '#f1f5f9',
    surfaceHighlight: '#fdf2f8',

    // Borders
    border: '#e2e8f0',
    borderSubtle: '#f1f5f9',
    borderInput: '#cbd5e1',
    borderFocus: '#7c3aed',

    // Typography
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    titlePlum: '#4c0519', // Deep burgundy / plum for "Utwórz trasę" header

    // Brand Actions & Accents
    brandPrimary: '#d90479', // Vibrant magenta / fuchsia CTA (Apply button in Attachment 1)
    brandPrimaryHover: '#be185d',
    brandPrimaryLight: '#fdf2f8',

    brandSecondary: '#7c3aed', // Purple / Violet (active bottom tab & icons in Attachment 1)
    brandSecondaryHover: '#6d28d9',
    brandSecondaryLight: '#ede9fe',

    // H3 Hexagons on Leaflet Map
    hexUndiscoveredFill: '#475569', // Fog of war neutral slate fill
    hexUndiscoveredBorder: '#64748b',
    hexActiveRouteFill: '#34d399',  // Light green / mint fill along the planned route (Attachment 1)
    hexActiveRouteBorder: '#059669', // Darker green border along route

    // Obstacle & Timeline Statuses (Attachments 1 & 2)
    obstacleSuccess: {
      bg: '#16a34a',
      lightBg: '#dcfce7',
      text: '#15803d',
      border: '#bbf7d0',
    },
    obstacleWarning: {
      bg: '#f59e0b',
      lightBg: '#fef3c7',
      text: '#b45309',
      border: '#fde68a',
    },
    obstacleInfo: {
      bg: '#0284c7',
      lightBg: '#e0f2fe',
      text: '#0369a1',
      border: '#bae6fd',
    },
    obstacleNeutral: {
      bg: '#334155',
      lightBg: '#f1f5f9',
      text: '#334155',
      border: '#e2e8f0',
    },

    // Turn-by-Turn Banner (Attachment 2)
    turnBannerBg: '#0f172a',
    turnBannerIconBg: '#f59e0b',
    turnBannerText: '#ffffff',
    turnBannerMuted: '#94a3b8',
  },
  borderRadius: {
    pill: '9999px',
    card: '16px',
    drawer: '24px',
  },
  shadows: {
    subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    card: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    floating: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
    sheet: '0 -4px 20px 0 rgba(0, 0, 0, 0.08)',
  },
} as const;

export type AppTheme = typeof APP_THEME;
