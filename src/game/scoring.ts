import type { LevelDef } from './levels/types';
import type { Stars, VoyageTotals } from './types';

type ScoreLevel = Pick<LevelDef, 'costTargetK' | 'co2TargetT'>;

/** Failure → 0; else 1, +1 if under cost target, +1 more only if also under CO₂ target. */
export function computeStars(level: ScoreLevel, totals: VoyageTotals, failed: boolean): Stars {
  if (failed) return 0;
  if (totals.costK > level.costTargetK) return 1;
  if (totals.co2T > level.co2TargetT) return 2;
  return 3;
}
