import { environmentAt } from './environment';
import { dist, dot, lerp, normalize, sub } from './geometry';
import type { LandField } from './landField';
import type { LevelDef } from './levels/types';
import { computeStars } from './scoring';
import {
  CO2_T_PER_NM,
  COAST_DANGER_UNITS,
  CURRENT_SPEED_GAIN,
  ECA_EMISSION,
  ECA_PRICE,
  FUEL_K_PER_NM,
  MIN_EFF_SPEED,
  NM_PER_UNIT,
  SPEED_FACTOR,
  SPEED_KN,
  STEP_UNITS,
  WIND_COST_CLAMP_KN,
  WIND_COST_GAIN,
  WIND_RANK,
  WIND_SPEED_GAIN,
} from './tuning';
import type { FailReason, Route, Sample, Speed, Vec, VoyageResult } from './types';

export type SimLevel = Pick<
  LevelDef,
  'windZones' | 'currents' | 'ecas' | 'budgetK' | 'deadlineH' | 'costTargetK' | 'co2TargetT'
>;

interface SimOptions {
  checkFailures: boolean;
}

function run(level: SimLevel, points: Vec[], speeds: Speed[], land: LandField, opts: SimOptions): VoyageResult {
  const samples: Sample[] = [];
  let costK = 0;
  let hours = 0;
  let co2T = 0;
  let failure: VoyageResult['failure'];

  if (points.length > 0) samples.push({ pos: points[0], legIndex: 0, costK, hours, co2T });

  legs: for (let leg = 0; leg < points.length - 1; leg++) {
    const a = points[leg];
    const b = points[leg + 1];
    const speed = speeds[leg] ?? 'normal';
    const legLen = dist(a, b);
    if (legLen === 0) continue;
    const dir = normalize(sub(b, a));
    const n = Math.max(1, Math.ceil(legLen / STEP_UNITS));
    const nm = (legLen / n) * NM_PER_UNIT;
    const v = SPEED_KN[speed];
    const factor = SPEED_FACTOR[speed];

    for (let i = 1; i <= n; i++) {
      const pos = lerp(a, b, i / n);
      const mid = lerp(a, b, (i - 0.5) / n);
      const env = environmentAt(level, mid);
      const alongWind = dot(env.wind, dir);
      const alongCurrent = dot(env.current, dir);
      const effSpeed = Math.max(MIN_EFF_SPEED, v + WIND_SPEED_GAIN * alongWind + CURRENT_SPEED_GAIN * alongCurrent);
      const windTerm = 1 - WIND_COST_GAIN * Math.max(-WIND_COST_CLAMP_KN, Math.min(WIND_COST_CLAMP_KN, alongWind));
      const price = env.inEca ? ECA_PRICE : 1;
      const emission = env.inEca ? ECA_EMISSION : 1;

      hours += nm / effSpeed;
      costK += nm * factor * FUEL_K_PER_NM * price * windTerm;
      co2T += nm * factor * CO2_T_PER_NM * emission * windTerm;
      samples.push({ pos, legIndex: leg, costK, hours, co2T });

      if (opts.checkFailures) {
        const reason = failureAt(level, land, pos, env.windStrength, costK, hours);
        if (reason) {
          failure = { reason, sampleIndex: samples.length - 1 };
          break legs;
        }
      }
    }
  }

  const totals = { costK, hours, co2T };
  return { samples, totals, failure, stars: computeStars(level, totals, failure !== undefined) };
}

function failureAt(
  level: SimLevel,
  land: LandField,
  pos: Vec,
  windStrength: keyof typeof WIND_RANK,
  costK: number,
  hours: number
): FailReason | undefined {
  if (land.isLand(pos)) return 'land';
  if (WIND_RANK[windStrength] >= WIND_RANK.strong && land.distToLand(pos) < COAST_DANGER_UNITS) {
    return 'coastalWind';
  }
  if (costK > level.budgetK) return 'overBudget';
  if (hours > level.deadlineH) return 'missedDeadline';
  return undefined;
}

/** Full voyage with failure checks; used for sailing and scoring. */
export function simulate(level: SimLevel, route: Route, land: LandField): VoyageResult {
  return run(level, route.points, route.speeds, land, { checkFailures: true });
}

/** Totals for whatever legs are drawn so far; never fails. Used for live meters. */
export function simulateEstimate(level: SimLevel, route: Partial<Route>, land: LandField): VoyageResult {
  return run(level, route.points ?? [], route.speeds ?? [], land, { checkFailures: false });
}

export interface RouteValidation {
  blockedLegs: number[];
  blockedPoints: number[];
}

export function validateRoute(_level: unknown, route: Partial<Route>, land: LandField): RouteValidation {
  const points = route.points ?? [];
  const blockedPoints: number[] = [];
  const blockedLegs: number[] = [];
  points.forEach((p, i) => {
    if (land.isLand(p)) blockedPoints.push(i);
  });
  for (let i = 0; i < points.length - 1; i++) {
    if (land.segmentHitsLand(points[i], points[i + 1])) blockedLegs.push(i);
  }
  return { blockedLegs, blockedPoints };
}
