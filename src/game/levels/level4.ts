import type { LevelDef } from './types';

/** Regulated waters: the short way round the island is an ECA (pricier fuel, far cleaner); the other way is long. */
export const level4: LevelDef = {
  id: 4,
  textKey: 'l4',
  viewport: { x: 230, y: 545, w: 200, h: 146.9 },
  start: { x: 310, y: 590 },
  end: { x: 310, y: 655 },
  budgetK: 420,
  deadlineH: 220,
  costTargetK: 260,
  co2TargetT: 450,
  windZones: [],
  ecas: [
    [
      { x: 322, y: 595 },
      { x: 378, y: 595 },
      { x: 378, y: 650 },
      { x: 322, y: 650 },
    ],
  ],
  currents: [],
  referenceRoute: {
    points: [
      { x: 310, y: 590 },
      { x: 342, y: 622 },
      { x: 310, y: 655 },
    ],
    speeds: ['normal', 'normal'],
  },
  badRoutes: [
    {
      points: [
        { x: 310, y: 590 },
        { x: 242, y: 622 },
        { x: 310, y: 655 },
      ],
      speeds: ['normal', 'normal'],
    },
  ],
};
