import type { LevelDef } from './types';

/** Against the clock: Normal is too slow, all-Fast too costly; mix speeds. */
export const level5: LevelDef = {
  id: 5,
  textKey: 'l5',
  viewport: { x: 285, y: 400, w: 180, h: 132.2 },
  start: { x: 300, y: 455 },
  end: { x: 400, y: 495 },
  budgetK: 325,
  deadlineH: 128,
  costTargetK: 290,
  co2TargetT: 850,
  windZones: [],
  ecas: [],
  currents: [],
  referenceRoute: {
    points: [
      { x: 300, y: 455 },
      { x: 350, y: 465 },
      { x: 400, y: 495 },
    ],
    speeds: ['fast', 'normal'],
  },
  badRoutes: [
    {
      points: [
        { x: 300, y: 455 },
        { x: 350, y: 465 },
        { x: 400, y: 495 },
      ],
      speeds: ['normal', 'normal'],
    },
    {
      points: [
        { x: 300, y: 455 },
        { x: 400, y: 495 },
      ],
      speeds: ['fast'],
    },
  ],
};
