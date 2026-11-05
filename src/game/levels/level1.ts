import type { LevelDef } from './types';

/** A calm first voyage: learn to steer around an island and change speed. */
export const level1: LevelDef = {
  id: 1,
  textKey: 'l1',
  viewport: { x: 200, y: 322, w: 160, h: 118 },
  start: { x: 238, y: 388 },
  end: { x: 322, y: 372 },
  budgetK: 450,
  deadlineH: 264,
  costTargetK: 340,
  co2TargetT: 800,
  windZones: [],
  ecas: [],
  currents: [],
  tutorial: ['straightRoute', 'waypoints', 'speed'],
  referenceRoute: {
    points: [
      { x: 238, y: 388 },
      { x: 268, y: 416 },
      { x: 305, y: 416 },
      { x: 322, y: 372 },
    ],
    speeds: ['normal', 'normal', 'normal'],
  },
  badRoutes: [
    {
      points: [
        { x: 238, y: 388 },
        { x: 262, y: 336 },
        { x: 306, y: 336 },
        { x: 322, y: 372 },
      ],
      speeds: ['fast', 'fast', 'fast'],
    },
  ],
};
