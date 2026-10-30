export interface Vec {
  x: number;
  y: number;
}

export type Speed = 'slow' | 'normal' | 'fast';

export const SPEEDS: readonly Speed[] = ['slow', 'normal', 'fast'];

/** speeds.length === points.length - 1; points[0] = start port, last = end port. */
export interface Route {
  points: Vec[];
  speeds: Speed[];
}

export interface Sample {
  pos: Vec;
  legIndex: number;
  costK: number;
  hours: number;
  co2T: number;
}

export type FailReason = 'land' | 'coastalWind' | 'overBudget' | 'missedDeadline';

export type Stars = 0 | 1 | 2 | 3;

export interface VoyageTotals {
  costK: number;
  hours: number;
  co2T: number;
}

export interface VoyageResult {
  samples: Sample[];
  totals: VoyageTotals;
  failure?: { reason: FailReason; sampleIndex: number };
  stars: Stars;
}
