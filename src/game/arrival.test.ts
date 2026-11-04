import { describe, expect, it } from 'vitest';
import { firstArrival, waypointInsidePort } from './arrival';
import { PlanningState } from './planningState';

const start = { x: 0, y: 0 };
const end = { x: 100, y: 0 };

describe('destination arrival', () => {
  it('finds the first crossing, including a segment whose endpoints are outside the radius', () => {
    const route = { points: [start, { x: 110, y: 1 }, { x: 120, y: 20 }], speeds: ['normal', 'fast'] as const };
    expect(firstArrival({ points: route.points, speeds: [...route.speeds] }, end, 3, false)).toBe(0);
    expect(firstArrival({ points: route.points, speeds: [...route.speeds] }, end, 0.5, false)).toBeNull();
  });

  it('does not truncate the ordinary final leg of a completed route', () => {
    expect(firstArrival({ points: [start, { x: 50, y: 10 }, end], speeds: ['normal', 'slow'] }, end, 5, true)).toBeNull();
  });

  it('truncates a moved route and undo restores all points and speeds in one step', () => {
    const state = new PlanningState({ start, end }, {
      points: [start, { x: 50, y: 20 }, { x: 120, y: 20 }, end],
      speeds: ['slow', 'fast', 'normal'],
    });
    const before = state.snapshot();
    state.beginMove(1);
    state.moveWaypoint(1, { x: 110, y: 0 });
    const leg = firstArrival(state.route, end, 5, true);
    expect(leg).toBe(0);
    state.finishAtLeg(leg!);
    expect(state.snapshot()).toEqual({ points: [start, end], speeds: ['slow'] });
    state.undo();
    expect(state.snapshot()).toEqual(before);
  });

  it('detects an invalid waypoint inside a departure harbour', () => {
    expect(waypointInsidePort({ x: 2, y: 0 }, start, 3)).toBe(true);
    expect(waypointInsidePort({ x: 3, y: 0 }, start, 3)).toBe(false);
  });
});
