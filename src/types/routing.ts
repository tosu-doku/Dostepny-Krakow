import { Barrier } from './barrier';

export type NavigationProfile =
  | 'wheelchair'
  | 'stroller'
  | 'visually_impaired'
  | 'foot_walking';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteStep {
  id: string;
  instruction: string;
  distance_meters: number;
  duration_seconds: number;
  coordinates: [number, number][]; // [[lng, lat], ...]
  audit_status: 'STAN_ZNANY' | 'STAN_NIEZNANY'; // AGENTS.md rule: "Stan nieznany (brak audytu)"
  audit_label: string; // e.g. "Stan nieznany (brak audytu)" or "Zweryfikowane przeszkody"
  barriers: Barrier[];
}

export interface RouteResult {
  profile: NavigationProfile;
  total_distance_meters: number;
  total_duration_seconds: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [[lng, lat], ...]
  };
  steps: RouteStep[];
  all_barriers: Barrier[];
  summary: {
    total_steps: number;
    unverified_steps_count: number;
    barrier_count: number;
    high_risk_barriers_count: number; // e.g. stairs without ramp for wheelchair
    has_unknown_audit: boolean;
  };
}
