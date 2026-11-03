import type { Route, Speed, Vec } from '../types';
import type { Rect } from '../world';

export type WindStrength = 'light' | 'strong' | 'storm';

export interface WindZone {
  polygon: Vec[];
  /** Unit vector the wind blows towards. */
  dir: Vec;
  knots: number;
  strength: WindStrength;
  weather?: {
    fromHour: number;
    toHour: number;
    fromIntensity: number;
    toIntensity: number;
  };
}

export interface CurrentZone {
  polygon: Vec[];
  /** Unit vector the current flows towards. */
  dir: Vec;
  knots: number;
}

export type TutorialStepId = 'straightRoute' | 'waypoints' | 'wind' | 'eca' | 'speed';

/** Key into `t().levels`. */
export type LevelTextKey = 'l1' | 'l2' | 'l3' | 'l4' | 'l5' | 'l6' | 'l7';

export interface LevelDef {
  id: number;
  /** Title, intro, new-element and port names live in `t().levels[textKey]`. */
  textKey: LevelTextKey;
  /** World-unit rect shown by the planning camera; aspect ≈ 980:720. */
  viewport: Rect;
  start: Vec;
  end: Vec;
  budgetK: number;
  deadlineH: number;
  costTargetK: number;
  co2TargetT: number;
  windZones: WindZone[];
  ecas: Vec[][];
  currents: CurrentZone[];
  allowedSpeeds?: Speed[];
  tutorial?: TutorialStepId[];
  /** Hand-tuned 3-star solution. */
  referenceRoute: Route;
  /** Routes that must NOT earn 3 stars (they fail or score ≤ 1), asserting the lesson. */
  badRoutes?: Route[];
}
