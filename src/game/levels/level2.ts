import type { LevelDef } from './types';

/** Islands & straits: a narrow strait saves a long detour around the island chain. */
export const level2: LevelDef = {
  id: 2,
  textKey: 'l2',
  viewport: { x: 345, y: 340, w: 165, h: 121.2 },
  start: { x: 440, y: 352 },
  end: { x: 400, y: 440 },
  budgetK: 400,
  deadlineH: 240,
  costTargetK: 220,
  co2TargetT: 660,
  windZones: [],
  ecas: [],
  currents: [],
  referenceRoute: {
    points: [
      { x: 440, y: 352 },
      { x: 414, y: 391 },
      { x: 400, y: 440 },
    ],
    speeds: ['normal', 'normal'],
  },
  badRoutes: [
    {
      points: [
        { x: 440, y: 352 },
        { x: 380, y: 380 },
        { x: 369, y: 399 },
        { x: 400, y: 440 },
      ],
      speeds: ['normal', 'normal', 'normal'],
    },
  ],
};
