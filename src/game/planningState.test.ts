import { describe, expect, it } from 'vitest';
import { PlanningState } from './planningState';

const level = { start: { x: 0, y: 0 }, end: { x: 100, y: 0 } };

function complete(): PlanningState {
  const s = new PlanningState(level);
  s.clickStart();
  s.addWaypoint({ x: 30, y: 10 });
  s.addWaypoint({ x: 60, y: 10 });
  s.clickEnd();
  return s;
}

describe('PlanningState', () => {
  it('builds a route start → waypoints → end', () => {
    const s = complete();
    expect(s.stage).toBe('complete');
    expect(s.route.points).toHaveLength(4);
    expect(s.route.speeds).toEqual(['normal', 'normal', 'normal']);
    expect(s.route.points.at(-1)).toEqual(level.end);
  });

  it('ignores operations in the wrong stage', () => {
    const s = new PlanningState(level);
    expect(s.addWaypoint({ x: 1, y: 1 })).toBe(false);
    expect(s.clickEnd()).toBe(false);
    s.clickStart();
    expect(s.clickStart()).toBe(false);
  });

  it('insertWaypoint splits a leg and keeps its speed', () => {
    const s = complete();
    s.setLegSpeed(1, 'fast');
    expect(s.insertWaypoint(1, { x: 45, y: 20 })).toBe(2);
    expect(s.route.points[2]).toEqual({ x: 45, y: 20 });
    expect(s.route.speeds).toEqual(['normal', 'fast', 'fast', 'normal']);
  });

  it('undo after drag restores the pre-drag position in one step', () => {
    const s = complete();
    const before = s.undoStack.length;
    s.beginMove(1);
    s.moveWaypoint(1, { x: 31, y: 11 });
    s.moveWaypoint(1, { x: 35, y: 15 });
    s.moveWaypoint(1, { x: 40, y: 20 });
    expect(s.undoStack.length).toBe(before + 1);
    s.undo();
    expect(s.route.points[1]).toEqual({ x: 30, y: 10 });
  });

  it('cancelMove snaps back without leaving an undo entry', () => {
    const s = complete();
    const before = s.undoStack.length;
    s.beginMove(2);
    s.moveWaypoint(2, { x: 99, y: 99 });
    s.cancelMove();
    expect(s.route.points[2]).toEqual({ x: 60, y: 10 });
    expect(s.undoStack.length).toBe(before);
  });

  it('ports are not deletable or movable', () => {
    const s = complete();
    expect(s.deleteWaypoint(0)).toBe(false);
    expect(s.deleteWaypoint(3)).toBe(false);
    expect(s.beginMove(0)).toBe(false);
    expect(s.beginMove(3)).toBe(false);
    s.moveWaypoint(3, { x: 5, y: 5 });
    expect(s.route.points[3]).toEqual(level.end);
  });

  it('delete merges legs keeping the first leg speed', () => {
    const s = complete();
    s.setLegSpeed(0, 'slow');
    s.setLegSpeed(1, 'fast');
    s.deleteWaypoint(1);
    expect(s.route.points).toHaveLength(3);
    expect(s.route.speeds).toEqual(['slow', 'normal']);
  });

  it('deleting the trailing waypoint while drawing drops its leg', () => {
    const s = new PlanningState(level);
    s.clickStart();
    s.addWaypoint({ x: 10, y: 10 });
    s.addWaypoint({ x: 20, y: 10 });
    expect(s.deleteWaypoint(2)).toBe(true);
    expect(s.route.points).toHaveLength(2);
    expect(s.route.speeds).toHaveLength(1);
  });

  it('undo walks back through add/insert/delete/speed changes', () => {
    const s = complete();
    s.insertWaypoint(0, { x: 15, y: 5 });
    s.deleteWaypoint(2);
    s.setAllSpeeds('slow');
    s.undo();
    expect(s.route.speeds.every((sp) => sp === 'normal')).toBe(true);
    s.undo();
    expect(s.route.points).toHaveLength(5);
    s.undo();
    expect(s.route.points).toHaveLength(4);
    s.undo();
    expect(s.stage).toBe('drawing');
    s.undo();
    s.undo();
    s.undo();
    expect(s.stage).toBe('pickStart');
    expect(s.canUndo).toBe(false);
    expect(s.undo()).toBe(false);
  });

  it('respects a single allowed speed', () => {
    const s = new PlanningState({ ...level, allowedSpeeds: ['slow'] });
    s.clickStart();
    s.clickEnd();
    expect(s.route.speeds).toEqual(['slow']);
    expect(s.setLegSpeed(0, 'fast')).toBe(false);
  });

  it('cycles a leg through its allowed speeds and supports undo', () => {
    const s = complete();
    expect(s.cycleLegSpeed(0)).toBe(true);
    expect(s.route.speeds[0]).toBe('fast');
    s.cycleLegSpeed(0);
    expect(s.route.speeds[0]).toBe('slow');
    s.cycleLegSpeed(0);
    expect(s.route.speeds[0]).toBe('normal');
    s.undo();
    expect(s.route.speeds[0]).toBe('slow');
    const restricted = new PlanningState({ ...level, allowedSpeeds: ['normal', 'slow'] });
    restricted.clickStart();
    restricted.clickEnd();
    restricted.cycleLegSpeed(0);
    expect(restricted.route.speeds[0]).toBe('slow');
  });

  it('starts complete when given an initial route and emits ops', () => {
    const s = new PlanningState(level, {
      points: [level.start, { x: 50, y: 5 }, level.end],
      speeds: ['fast', 'slow'],
    });
    expect(s.stage).toBe('complete');
    const ops: string[] = [];
    s.onChange((op) => ops.push(op));
    s.setLegSpeed(0, 'normal');
    s.undo();
    expect(ops).toEqual(['speed', 'undo']);
    expect(s.route.speeds).toEqual(['fast', 'slow']);
  });

  it('clears an out-of-range selection', () => {
    const s = complete();
    s.selectLeg(2);
    s.deleteWaypoint(2);
    expect(s.selectedLeg).toBe(1);
  });
});
