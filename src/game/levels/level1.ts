import type { LevelDef } from './types';

/** Placeholder; replaced with tutorial content in phase 7. */
export const level1: LevelDef = {
  id: 1,
  textKey: 'l1',
  viewport: { x: 260, y: 290, w: 180, h: 132 },
  start: { x: 290, y: 330 },
  end: { x: 410, y: 380 },
  budgetK: 400,
  deadlineH: 400,
  costTargetK: 300,
  co2TargetT: 900,
  windZones: [],
  ecas: [],
  currents: [],
  referenceRoute: {
    points: [
      { x: 290, y: 330 },
      { x: 410, y: 380 },
    ],
    speeds: ['normal'],
  },
};
