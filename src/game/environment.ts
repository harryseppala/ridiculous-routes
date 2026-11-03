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

export function windIntensity(zone: LevelDef['windZones'][number], hours: number): number {
  const weather = zone.weather;
  if (!weather) return 1;
  const progress = Math.max(0, Math.min(1, (hours - weather.fromHour) / Math.max(0.001, weather.toHour - weather.fromHour)));
  return Math.max(0, Math.min(1, weather.fromIntensity + (weather.toIntensity - weather.fromIntensity) * progress));
}

/** Overlapping zones: strongest wind wins; currents add. */
export function environmentAt(level: EnvLevel, p: Vec, hours = 0): Environment {
  let wind: Vec = { x: 0, y: 0 };
  let windStrength: Environment['windStrength'] = 'none';
  let windKnots = 0;
  for (const z of level.windZones) {
    if (!pointInPolygon(p, z.polygon)) continue;
    const intensity = windIntensity(z, hours);
    const strength = intensity < 0.05 ? 'none' : intensity < 0.6 ? 'light' : z.strength;
    const knots = z.knots * intensity;
    const rank = WIND_RANK[strength];
    if (rank > WIND_RANK[windStrength] || (rank === WIND_RANK[windStrength] && knots > windKnots)) {
      windStrength = strength;
      windKnots = knots;
      wind = scale(z.dir, knots);
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
