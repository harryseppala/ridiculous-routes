import { describe, expect, it } from 'vitest';
import {
  closestOnSegment,
  distToSegment,
  normalize,
  pointInPolygon,
  polylineLength,
  sampleSegment,
} from './geometry';

describe('geometry', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('pointInPolygon', () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
    expect(pointInPolygon({ x: -1, y: -1 }, square)).toBe(false);
  });

  it('distToSegment and closestOnSegment', () => {
    expect(distToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3);
    expect(distToSegment({ x: -4, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
    expect(closestOnSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 }).t).toBe(0.5);
  });

  it('sampleSegment spaces points evenly and ends at b', () => {
    const pts = sampleSegment({ x: 0, y: 0 }, { x: 10, y: 0 }, 2);
    expect(pts).toHaveLength(5);
    expect(pts[4]).toEqual({ x: 10, y: 0 });
    expect(sampleSegment({ x: 0, y: 0 }, { x: 0, y: 0 }, 2)).toHaveLength(1);
  });

  it('polylineLength and normalize', () => {
    expect(polylineLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }])).toBe(11);
    expect(normalize({ x: 3, y: 4 })).toEqual({ x: 0.6, y: 0.8 });
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});
