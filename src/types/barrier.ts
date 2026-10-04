export type VerificationStatus =
  | 'UNVERIFIED'
  | 'COMMUNITY_CONFIRMED'
  | 'VERIFIED'
  | 'DISPUTED';

export type BarrierType =
  | 'STAIRS'
  | 'HIGH_KERB'
  | 'STEEP_INCLINE'
  | 'COBBLESTONE_SURFACE'
  | 'NARROW_SIDEWALK'
  | 'NO_TACTILE_PAVING'
  | 'ELEVATOR_OUT_OF_ORDER';

export interface StairsDetails {
  step_count?: number;
  has_ramp?: boolean;
  handrail?: boolean;
}

export interface KerbDetails {
  height_cm?: number;
}

export interface InclineDetails {
  incline_percent?: number;
}

export interface BarrierDetails extends Record<string, unknown> {
  step_count?: number | string;
  has_ramp?: boolean;
  ramp_type?: string;
  ramp_stroller?: boolean;
  handrail?: boolean;
  has_handrail?: boolean;
  handrail_details?: string;
  tactile_paving?: boolean;
  surface?: string;
  surface_label?: string;
  smoothness?: string;
  highway?: string;
  is_area?: boolean;
  wheelchair?: string;
  incline?: string;
  width?: number | string;
  lit?: boolean;
  osm_id?: string;
  geometry?: any;
  height_cm?: number;
  incline_percent?: number;
  out_of_order_since?: string;
  notes?: string;
}

export interface Barrier {
  id: string;
  created_at: string;
  updated_at: string;
  barrier_type: BarrierType;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  } | string;
  latitude: number;
  longitude: number;
  address_description?: string | null;
  details: BarrierDetails;
  source: string; // 'CROWDSOURCED' | 'MSIP_KRAKOW' | 'OSM' | etc.
  status: VerificationStatus;
  confidence_score: number; // 0.0 - 1.0
  last_verified_at: string;
  upvotes?: number;
  image_url?: string | null;
  created_by?: string | null;
  distance_from_route?: number;
}

export interface CreateBarrierInput {
  barrier_type: BarrierType;
  latitude: number;
  longitude: number;
  address_description?: string;
  details: BarrierDetails;
  source?: string;
  status?: VerificationStatus;
  confidence_score?: number;
  image_url?: string | null;
  created_by?: string | null;
}
