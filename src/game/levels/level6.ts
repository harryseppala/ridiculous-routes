import type { LevelDef } from './types';

/** Ride the current: following the current lets you sail Slow and still arrive on time. */
export const level6: LevelDef = {
  id: 6,
  textKey: 'l6',
  viewport: { x: 830, y: 320, w: 190, h: 139.6 },
  start: { x: 850, y: 425 },
  end: { x: 1000, y: 380 },
  budgetK: 420,
  deadlineH: 196,
  costTargetK: 250,
  co2TargetT: 700,
  windZones: [],
  ecas: [],
  currents: [
    {
      polygon: [
        { x: 845, y: 402 },
        { x: 1012, y: 402 },
        { x: 1012, y: 432 },
        { x: 845, y: 432 },
      ],
      dir: { x: 1, y: 0 },
      knots: 10,
    },
  ],
  referenceRoute: {
    points: [
      { x: 850, y: 425 },
      { x: 990, y: 418 },
      { x: 1000, y: 380 },
    ],
    speeds: ['slow', 'slow'],
  },
  badRoutes: [
    {
      points: [
        { x: 850, y: 425 },
        { x: 1000, y: 380 },
      ],
      speeds: ['normal'],
    },
  ],
};
