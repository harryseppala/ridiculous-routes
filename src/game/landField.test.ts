import { describe, expect, it } from 'vitest';
import { realLandField, syntheticLandField } from './testing/loadLandField';

describe('LandField (real mask)', () => {
  const field = realLandField();

  it('matches the baked mask size', () => {
    expect(field.width).toBe(2051);
    expect(field.height).toBe(1387);
  });

  it('classifies a known open-ocean point as water', () => {
    expect(field.isLand({ x: 350, y: 350 })).toBe(false);
    expect(field.distToLand({ x: 350, y: 350 })).toBeGreaterThan(30);
  });

  it('classifies a known continent point as land', () => {
    expect(field.isLand({ x: 870, y: 500 })).toBe(true);
    expect(field.distToLand({ x: 870, y: 500 })).toBe(0);
  });

  it('treats out-of-bounds as land', () => {
    expect(field.isLand({ x: -1, y: 10 })).toBe(true);
    expect(field.isLand({ x: 10, y: 9999 })).toBe(true);
  });
});

describe('LandField (synthetic)', () => {
  const field = syntheticLandField(200, 200, [{ x: 140, y: 0, w: 10, h: 200 }]);

  it('distance field grows monotonically away from the coast', () => {
    let prev = -1;
    for (let x = 139; x >= 90; x -= 3) {
      const d = field.distToLand({ x, y: 100 });
      expect(d).toBeGreaterThan(prev);
      prev = d;
    }
  });

  it('distance is approximately Euclidean', () => {
    expect(field.distToLand({ x: 120, y: 100 })).toBeCloseTo(20, 0);
  });

  it('does not count the map edge as a coastline', () => {
    expect(field.distToLand({ x: 1, y: 100 })).toBeGreaterThan(100);
  });

  it('detects segments crossing land', () => {
    expect(field.segmentHitsLand({ x: 100, y: 25 }, { x: 180, y: 25 })).toBe(true);
    expect(field.segmentHitsLand({ x: 100, y: 10 }, { x: 135, y: 40 })).toBe(false);
  });
});
