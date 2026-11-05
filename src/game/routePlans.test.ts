import { describe, expect, it } from 'vitest';
import { sampleSegment } from './geometry';
import { level1 } from './levels/level1';
import { MAX_ROUTES, RoutePlans } from './routePlans';
import { validateRoute } from './simulate';
import { realLandField } from './testing/loadLandField';

describe('RoutePlans', () => {
  it('starts with one blank selected route', () => {
    const plans = new RoutePlans(level1);
    expect(plans.count).toBe(1);
    expect(plans.selectedIndex).toBe(0);
    expect(plans.selected.stage).toBe('pickStart');
    expect(plans.selected.canUndo).toBe(false);
  });

  it('adds blank routes, preserves edits, and isolates undo and speed changes', () => {
    const plans = new RoutePlans(level1);
    const first = plans.selected;
    first.clickStart();
    first.clickEnd();
    first.cycleLegSpeed(0);
    const saved = first.snapshot();
    expect(plans.add()).toBe(true);
    expect(plans.selected.stage).toBe('pickStart');
    expect(plans.selected.canUndo).toBe(false);
    plans.selected.clickStart();
    plans.selected.undo();
    expect(plans.selected.stage).toBe('pickStart');
    plans.select(0);
    expect(plans.selected).toBe(first);
    expect(plans.selected.snapshot()).toEqual(saved);
    first.undo();
    expect(first.route.speeds).toEqual(['normal']);
  });

  it('caps at five and immediately frees a deleted slot', () => {
    const plans = new RoutePlans(level1);
    for (let i = 1; i < MAX_ROUTES; i++) expect(plans.add()).toBe(true);
    expect(plans.count).toBe(5);
    expect(plans.canAdd).toBe(false);
    expect(plans.add()).toBe(false);
    expect(plans.delete(2)).toBe(true);
    expect(plans.canAdd).toBe(true);
    expect(plans.add()).toBe(true);
    expect(plans.count).toBe(5);
    expect(plans.selectedIndex).toBe(4);
    expect(plans.selected.route.points).toEqual([]);
  });

  it('selects the previous route after deletion and renumbers without losing identity', () => {
    const plans = new RoutePlans(level1);
    const first = plans.selected;
    plans.add();
    const second = plans.selected;
    plans.add();
    plans.delete(2);
    expect(plans.selectedIndex).toBe(1);
    expect(plans.selected).toBe(second);
    plans.delete(1);
    expect(plans.selected).toBe(first);
    expect(plans.delete(0)).toBe(false);
    expect(plans.count).toBe(1);
  });

  it('preserves the selected route when deleting other routes', () => {
    const plans = new RoutePlans(level1);
    plans.add();
    const selected = plans.selected;
    plans.add();
    plans.select(1);
    plans.delete(0);
    expect(plans.selectedIndex).toBe(0);
    expect(plans.selected).toBe(selected);
    plans.delete(1);
    expect(plans.selected).toBe(selected);
  });

  it('selects the new first route when deleting the selected first route', () => {
    const plans = new RoutePlans(level1);
    plans.add();
    const second = plans.selected;
    plans.select(0);
    plans.delete(0);
    expect(plans.selectedIndex).toBe(0);
    expect(plans.selected).toBe(second);
  });

  it('rejects invalid indices without changing selection or count', () => {
    const plans = new RoutePlans(level1);
    plans.add();
    for (const index of [-1, 2, 0.5, NaN]) {
      expect(plans.select(index)).toBe(false);
      expect(plans.delete(index)).toBe(false);
    }
    expect(plans.count).toBe(2);
    expect(plans.selectedIndex).toBe(1);
  });

  it('keeps land-crossing waypoints editable, invalid, and undoable', () => {
    const plans = new RoutePlans(level1);
    const state = plans.selected;
    const land = realLandField();
    state.clickStart();
    state.clickEnd();
    const point = sampleSegment(level1.start, level1.end, 0.5).find((p) => land.isLand(p));
    expect(point).toBeDefined();
    if (!point) throw new Error('The first route must cross the tutorial island');
    expect(state.insertWaypoint(0, point)).toBe(1);
    expect(validateRoute(level1, state.route, land).blockedPoints).toContain(1);
    state.beginMove(1);
    state.moveWaypoint(1, { x: 268, y: 416 });
    state.undo();
    expect(state.route.points[1]).toEqual(point);
    state.undo();
    expect(state.route.points).toEqual([level1.start, level1.end]);
  });

  it('starting again discards all routes and their undo histories', () => {
    const plans = new RoutePlans(level1);
    plans.selected.clickStart();
    plans.add();
    plans.selected.clickStart();
    const restarted = new RoutePlans(level1);
    expect(restarted.count).toBe(1);
    expect(restarted.selected.route.points).toEqual([]);
    expect(restarted.selected.canUndo).toBe(false);
  });
});
