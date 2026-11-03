import { describe, expect, it } from 'vitest';
import { simulate, simulateEstimate, validateRoute } from '../simulate';
import { realLandField } from '../testing/loadLandField';
import { WORLD } from '../world';
import { LEVELS } from './index';

const land = realLandField();
const fmt = (n: number) => n.toFixed(1);

describe.each(LEVELS.map((l) => [l.id, l] as const))('level %i', (_id, level) => {
  it('has ports on open water', () => {
    expect(land.distToLand(level.start)).toBeGreaterThan(2);
    expect(land.distToLand(level.end)).toBeGreaterThan(2);
  });

  it('has a viewport inside the world with the planning aspect', () => {
    const v = level.viewport;
    expect(v.x).toBeGreaterThanOrEqual(0);
    expect(v.y).toBeGreaterThanOrEqual(0);
    expect(v.x + v.w).toBeLessThanOrEqual(WORLD.width);
    expect(v.y + v.h).toBeLessThanOrEqual(WORLD.height);
    expect(v.w / v.h).toBeCloseTo(980 / 720, 1);
    for (const p of [level.start, level.end]) {
      expect(p.x).toBeGreaterThan(v.x);
      expect(p.x).toBeLessThan(v.x + v.w);
      expect(p.y).toBeGreaterThan(v.y);
      expect(p.y).toBeLessThan(v.y + v.h);
    }
  });

  it('reference route starts and ends at the ports and is well-formed', () => {
    const r = level.referenceRoute;
    expect(r.points[0]).toEqual(level.start);
    expect(r.points.at(-1)).toEqual(level.end);
    expect(r.speeds).toHaveLength(r.points.length - 1);
    if (level.allowedSpeeds) for (const s of r.speeds) expect(level.allowedSpeeds).toContain(s);
  });

  it('reference route avoids land and earns 3 stars', () => {
    const r = level.referenceRoute;
    expect(validateRoute(level, r, land)).toEqual({ blockedLegs: [], blockedPoints: [] });
    const res = simulate(level, r, land);
    const msg = `cost ${fmt(res.totals.costK)}/${level.costTargetK} co2 ${fmt(res.totals.co2T)}/${level.co2TargetT} h ${fmt(res.totals.hours)}/${level.deadlineH} fail ${res.failure?.reason}`;
    expect(res.failure, msg).toBeUndefined();
    expect(res.stars, msg).toBe(3);
  });

  it('naïve straight route does not earn 3 stars', () => {
    const straight = { points: [level.start, level.end], speeds: [level.referenceRoute.speeds[0]] };
    const v = validateRoute(level, straight, land);
    if (v.blockedLegs.length > 0) return; // crosses land: unplayable, lesson holds
    expect(simulate(level, straight, land).stars).toBeLessThan(3);
  });

  it('has at least one bad route that fails or scores ≤ 1', () => {
    expect(level.badRoutes?.length ?? 0).toBeGreaterThan(0);
    for (const bad of level.badRoutes ?? []) {
      expect(bad.points[0]).toEqual(level.start);
      expect(bad.points.at(-1)).toEqual(level.end);
      expect(validateRoute(level, bad, land).blockedLegs).toEqual([]);
      const res = simulate(level, bad, land);
      const msg = `cost ${fmt(res.totals.costK)} co2 ${fmt(res.totals.co2T)} h ${fmt(res.totals.hours)} fail ${res.failure?.reason}`;
      expect(res.stars, msg).toBeLessThanOrEqual(1);
    }
  });
});

describe('levels', () => {
  it('requires mixed speeds rather than a single straight leg in level 5', () => {
    const level = LEVELS[4];
    for (const speed of ['slow', 'normal', 'fast'] as const) {
      const straight = { points: [level.start, level.end], speeds: [speed] };
      expect(simulate(level, straight, land).failure).toBeDefined();
    }
  });

  it('makes the wind detour cheaper than the direct crossing in level 3', () => {
    const level = LEVELS[2];
    const direct = { points: [level.start, level.end], speeds: ['normal' as const] };
    const calm = { ...level, windZones: [] };
    expect(simulateEstimate(calm, direct, land).totals.costK).toBeLessThan(simulateEstimate(calm, level.referenceRoute, land).totals.costK);
    expect(simulateEstimate(level, direct, land).totals.costK).toBeGreaterThan(simulateEstimate(level, level.referenceRoute, land).totals.costK);
  });

  it('have sequential ids starting at 1', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(LEVELS.map((_, i) => i + 1));
  });
});
