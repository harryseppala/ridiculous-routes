import { describe, expect, it } from 'vitest';
import { environmentAt } from './environment';
import { computeStars } from './scoring';
import { simulate, simulateEstimate, validateRoute, type SimLevel } from './simulate';
import { syntheticLandField } from './testing/loadLandField';
import type { Route, Speed, Vec } from './types';

const W = 200;
const H = 100;
const everywhere: Vec[] = [
  { x: -10, y: -10 },
  { x: W + 10, y: -10 },
  { x: W + 10, y: H + 10 },
  { x: -10, y: H + 10 },
];
const box = (x0: number, y0: number, x1: number, y1: number): Vec[] => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

const openSea = syntheticLandField(W, H, [{ x: 100, y: 0, w: 10, h: 30 }]);

function level(overrides: Partial<SimLevel> = {}): SimLevel {
  return {
    windZones: [],
    currents: [],
    ecas: [],
    budgetK: 10_000,
    deadlineH: 10_000,
    costTargetK: 10_000,
    co2TargetT: 10_000,
    ...overrides,
  };
}

const straight = (speed: Speed = 'normal'): Route => ({
  points: [
    { x: 20, y: 80 },
    { x: 180, y: 80 },
  ],
  speeds: [speed],
});

describe('simulate: open water', () => {
  it.each([
    ['slow', 3200 / 12, 192, 576],
    ['normal', 200, 320, 960],
    ['fast', 160, 512, 1536],
  ] as const)('%s matches hand-computed values', (speed, hours, cost, co2) => {
    const r = simulate(level(), straight(speed), openSea);
    expect(r.failure).toBeUndefined();
    expect(r.totals.hours).toBeCloseTo(hours, 6);
    expect(r.totals.costK).toBeCloseTo(cost, 6);
    expect(r.totals.co2T).toBeCloseTo(co2, 6);
  });

  it('slow is cheaper and cleaner but slower than fast', () => {
    const slow = simulate(level(), straight('slow'), openSea).totals;
    const fast = simulate(level(), straight('fast'), openSea).totals;
    expect(slow.costK).toBeLessThan(fast.costK);
    expect(slow.co2T).toBeLessThan(fast.co2T);
    expect(slow.hours).toBeGreaterThan(fast.hours);
  });

  it('samples start at the start port with zero metrics and end at the end port', () => {
    const r = simulate(level(), straight(), openSea);
    expect(r.samples[0]).toMatchObject({ costK: 0, hours: 0, co2T: 0, pos: { x: 20, y: 80 } });
    expect(r.samples.at(-1)?.pos).toEqual({ x: 180, y: 80 });
  });
});

describe('simulate: wind', () => {
  const wind = (dir: Vec) => level({ windZones: [{ polygon: everywhere, dir, knots: 10, strength: 'light' }] });

  it('tailwind lowers time and cost', () => {
    const r = simulate(wind({ x: 1, y: 0 }), straight(), openSea).totals;
    expect(r.hours).toBeCloseTo(3200 / 21, 6);
    expect(r.costK).toBeCloseTo(320 * 0.8, 6);
  });

  it('headwind raises time and cost', () => {
    const r = simulate(wind({ x: -1, y: 0 }), straight(), openSea).totals;
    expect(r.hours).toBeCloseTo(3200 / 11, 6);
    expect(r.costK).toBeCloseTo(320 * 1.2, 6);
  });
});

describe('simulate: currents', () => {
  it('a following current speeds the ship up', () => {
    const lv = level({ currents: [{ polygon: everywhere, dir: { x: 1, y: 0 }, knots: 4 }] });
    expect(simulate(lv, straight(), openSea).totals.hours).toBeCloseTo(3200 / 20, 6);
  });
});

describe('simulate: ECA', () => {
  it('costs 1.5× and emits 0.5× inside an ECA', () => {
    const r = simulate(level({ ecas: [everywhere] }), straight(), openSea).totals;
    expect(r.costK).toBeCloseTo(480, 6);
    expect(r.co2T).toBeCloseTo(480, 6);
  });
});

describe('simulate: coastal wind', () => {
  const strongWind = level({
    windZones: [{ polygon: box(80, 0, 130, 100), dir: { x: 0, y: -1 }, knots: 25, strength: 'strong' }],
  });

  it('fails when strong wind blows near land', () => {
    const nearCoast = syntheticLandField(W, H, [{ x: 100, y: 0, w: 10, h: 76 }]);
    const r = simulate(strongWind, straight(), nearCoast);
    expect(r.failure?.reason).toBe('coastalWind');
    expect(r.stars).toBe(0);
    const pos = r.samples[r.failure!.sampleIndex].pos;
    expect(pos.x).toBeGreaterThanOrEqual(80);
    expect(pos.x).toBeLessThan(110);
  });

  it('is safe in the same wind in open sea', () => {
    expect(simulate(strongWind, straight(), openSea).failure).toBeUndefined();
  });

  it('light wind near land is safe', () => {
    const nearCoast = syntheticLandField(W, H, [{ x: 100, y: 0, w: 10, h: 76 }]);
    const light = level({
      windZones: [{ polygon: box(80, 0, 130, 100), dir: { x: 0, y: -1 }, knots: 10, strength: 'light' }],
    });
    expect(simulate(light, straight(), nearCoast).failure).toBeUndefined();
  });
});

describe('simulate: budget and deadline', () => {
  it('fails over budget at the first sample exceeding it', () => {
    const r = simulate(level({ budgetK: 100 }), straight(), openSea);
    expect(r.failure).toEqual({ reason: 'overBudget', sampleIndex: 26 });
    expect(r.samples).toHaveLength(27);
    expect(r.totals.costK).toBeCloseTo(104, 6);
  });

  it('fails the deadline at the first sample exceeding it', () => {
    const r = simulate(level({ deadlineH: 50 }), straight(), openSea);
    expect(r.failure).toEqual({ reason: 'missedDeadline', sampleIndex: 21 });
  });

  it('earliest failure wins', () => {
    const r = simulate(level({ budgetK: 100, deadlineH: 50 }), straight(), openSea);
    expect(r.failure?.reason).toBe('missedDeadline');
    const r2 = simulate(level({ budgetK: 60, deadlineH: 50 }), straight(), openSea);
    expect(r2.failure).toEqual({ reason: 'overBudget', sampleIndex: 16 });
  });
});

describe('land', () => {
  const crossing: Route = {
    points: [
      { x: 20, y: 10 },
      { x: 180, y: 10 },
    ],
    speeds: ['normal'],
  };

  it('validateRoute flags legs and points on land', () => {
    expect(validateRoute(null, crossing, openSea)).toEqual({ blockedLegs: [0], blockedPoints: [] });
    expect(validateRoute(null, straight(), openSea)).toEqual({ blockedLegs: [], blockedPoints: [] });
    const onLand = { points: [{ x: 20, y: 80 }, { x: 105, y: 10 }], speeds: ['normal' as Speed] };
    expect(validateRoute(null, onLand, openSea).blockedPoints).toEqual([1]);
  });

  it('simulate defensively fails on land', () => {
    const r = simulate(level(), crossing, openSea);
    expect(r.failure?.reason).toBe('land');
    expect(r.samples[r.failure!.sampleIndex].pos.x).toBeGreaterThanOrEqual(100);
  });
});

describe('simulateEstimate', () => {
  it('returns partial totals without failure', () => {
    const r = simulateEstimate(level({ budgetK: 1 }), { points: [{ x: 20, y: 80 }, { x: 100, y: 80 }], speeds: ['normal'] }, openSea);
    expect(r.failure).toBeUndefined();
    expect(r.totals.costK).toBeCloseTo(160, 6);
  });

  it('handles a route with only the start port', () => {
    const r = simulateEstimate(level(), { points: [{ x: 20, y: 80 }] }, openSea);
    expect(r.totals).toEqual({ costK: 0, hours: 0, co2T: 0 });
  });
});

describe('environmentAt', () => {
  it('strongest wind wins and currents add', () => {
    const lv = level({
      windZones: [
        { polygon: everywhere, dir: { x: 1, y: 0 }, knots: 10, strength: 'light' },
        { polygon: box(0, 0, 50, 50), dir: { x: 0, y: 1 }, knots: 40, strength: 'storm' },
      ],
      currents: [
        { polygon: everywhere, dir: { x: 1, y: 0 }, knots: 2 },
        { polygon: box(0, 0, 50, 50), dir: { x: 1, y: 0 }, knots: 1 },
      ],
      ecas: [box(0, 0, 50, 50)],
    });
    const inside = environmentAt(lv, { x: 10, y: 10 });
    expect(inside.windStrength).toBe('storm');
    expect(inside.wind).toEqual({ x: 0, y: 40 });
    expect(inside.current).toEqual({ x: 3, y: 0 });
    expect(inside.inEca).toBe(true);
    const outside = environmentAt(lv, { x: 100, y: 80 });
    expect(outside.windStrength).toBe('light');
    expect(outside.current).toEqual({ x: 2, y: 0 });
    expect(outside.inEca).toBe(false);
  });
});

describe('computeStars', () => {
  const lv = { costTargetK: 100, co2TargetT: 300 };
  it('applies thresholds', () => {
    expect(computeStars(lv, { costK: 50, hours: 1, co2T: 100 }, true)).toBe(0);
    expect(computeStars(lv, { costK: 150, hours: 1, co2T: 400 }, false)).toBe(1);
    expect(computeStars(lv, { costK: 100, hours: 1, co2T: 400 }, false)).toBe(2);
    expect(computeStars(lv, { costK: 100, hours: 1, co2T: 300 }, false)).toBe(3);
  });

  it('under CO₂ target but over cost target is 1 star', () => {
    expect(computeStars(lv, { costK: 150, hours: 1, co2T: 100 }, false)).toBe(1);
  });
});
