import { pointInPolygon, scale } from './geometry';
import type { LevelDef, WindStrength } from './levels/types';
import { WIND_RANK } from './tuning';
import type { Vec } from './types';

export interface Environment {
  /** Wind vector in knots (direction the wind blows towards). */
  wind: Vec;
  windStrength: WindStrength | 'none';
  /** Current vector in knots. */
  current: Vec;
  inEca: boolean;
}

type EnvLevel = Pick<LevelDef, 'windZones' | 'currents' | 'ecas'>;

/** Overlapping zones: strongest wind wins; currents add. */
export function environmentAt(level: EnvLevel, p: Vec): Environment {
  let wind: Vec = { x: 0, y: 0 };
  let windStrength: Environment['windStrength'] = 'none';
  let windKnots = 0;
  for (const z of level.windZones) {
    if (!pointInPolygon(p, z.polygon)) continue;
    const rank = WIND_RANK[z.strength];
    if (rank > WIND_RANK[windStrength] || (rank === WIND_RANK[windStrength] && z.knots > windKnots)) {
      windStrength = z.strength;
      windKnots = z.knots;
      wind = scale(z.dir, z.knots);
    }
  }

  const current: Vec = { x: 0, y: 0 };
  for (const c of level.currents) {
    if (!pointInPolygon(p, c.polygon)) continue;
    current.x += c.dir.x * c.knots;
    current.y += c.dir.y * c.knots;
  }

  const inEca = level.ecas.some((poly) => pointInPolygon(p, poly));
  return { wind, windStrength, current, inEca };
}
