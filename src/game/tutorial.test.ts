import { describe, expect, it } from 'vitest';
import { level1 } from './levels/level1';
import { simulate, validateRoute } from './simulate';
import { realLandField } from './testing/loadLandField';
import { routeTouchesEca, TutorialController, type TutorialContext } from './tutorial';
import type { Route } from './types';

const land = realLandField();
const S = level1.start;
const E = level1.end;

function ctx(route: Route, stage: TutorialContext['stage'] = 'complete'): TutorialContext {
  const result = stage === 'complete' ? simulate(level1, route, land) : undefined;
  return {
    route,
    stage,
    validation: validateRoute(level1, route, land),
    coastalWindFail: result?.failure?.reason === 'coastalWind',
    inEca: routeTouchesEca(level1, route),
  };
}

const route = (...pts: [number, number][]): Route => ({
  points: [S, ...pts.map(([x, y]) => ({ x, y })), E],
  speeds: Array(pts.length + 1).fill('normal'),
});

const straight = route();
const south = route([268, 416], [305, 416]);
const deep = route([247, 400], [312, 436]);

describe('TutorialController', () => {
  it('walks the three simple first-voyage steps in order', () => {
    const t = new TutorialController(level1.tutorial!);
    t.start(ctx({ points: [], speeds: [] }, 'pickStart'));
    expect(t.current).toBe('straightRoute');
    expect(t.allows('addWaypoint')).toBe(false);

    expect(t.handle('clickStart', ctx({ points: [S], speeds: [] }, 'drawing'))).toBe(false);
    expect(t.handle('clickEnd', ctx(straight))).toBe(true);
    expect(t.current).toBe('waypoints');
    expect(t.canContinue).toBe(false);
    expect(t.allows('insertWaypoint')).toBe(true);

    expect(t.handle('insertWaypoint', ctx(south))).toBe(true);
    expect(t.current).toBe('speed');

    expect(t.handle('move', ctx(deep))).toBe(false);
    expect(t.handle('speed', ctx(deep))).toBe(true);
    expect(t.done).toBe(true);
    expect(t.current).toBeNull();
  });

  it('step 1 requires zero waypoints', () => {
    const t = new TutorialController(level1.tutorial!);
    t.start(ctx({ points: [], speeds: [] }, 'pickStart'));
    expect(t.handle('clickEnd', ctx(south))).toBe(false);
    expect(t.current).toBe('straightRoute');
  });

  it('wind step offers Continue when the route is already safe', () => {
    const t = new TutorialController(['waypoints', 'wind', 'eca']);
    t.start(ctx(straight));
    expect(t.handle('insertWaypoint', ctx(south))).toBe(true);
    expect(t.current).toBe('wind');
    expect(t.canContinue).toBe(true);
    expect(t.continue(ctx(south))).toBe(true);
    expect(t.current).toBe('eca');
    expect(t.canContinue).toBe(false);
    expect(t.continue(ctx(south))).toBe(false);
  });

  it('ECA step completes when leaving the ECA too', () => {
    const t = new TutorialController(['eca']);
    t.start({ ...ctx(deep), inEca: true });
    expect(t.handle('move', ctx(south))).toBe(true);
  });

  it('blocked routes do not satisfy the waypoint step', () => {
    const t = new TutorialController(['waypoints']);
    t.start(ctx(straight));
    expect(t.handle('insertWaypoint', ctx(route([280, 395])))).toBe(false);
  });

  it('level 1 fixtures behave as the tutorial expects', () => {
    expect(validateRoute(level1, straight, land).blockedLegs.length).toBeGreaterThan(0);
    expect(ctx(south).inEca).toBe(false);
    expect(ctx(deep).inEca).toBe(false);
    expect(ctx(south).coastalWindFail).toBe(false);
    expect(ctx(south).validation.blockedLegs).toEqual([]);
    expect(ctx(deep).validation.blockedLegs).toEqual([]);
  });
});
