export interface DailyQuest {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  distanceText: string;
  currentChecks: number;
  qualityStatus: string;
  qualityNote: string;
  progressCurrent: number;
  progressTotal: number;
  baseXp: number;
  multiplier: number;
  bonusBadge: string;
  category: 'STAIRS' | 'EXPLORATION' | 'HIGH_KERB';
  coordinates?: { lat: number; lng: number };
}
