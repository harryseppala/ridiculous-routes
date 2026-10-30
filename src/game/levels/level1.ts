import type { LevelDef } from './types';

/**
 * Tutorial: an island between the ports, a windy strait to the north and a
 * regulated area (ECA) over the deep southern passage.
 */
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
  windZones: [
    {
      polygon: [
        { x: 246, y: 326 },
        { x: 318, y: 326 },
        { x: 318, y: 370 },
        { x: 246, y: 370 },
      ],
      dir: { x: 0, y: 1 },
      knots: 25,
      strength: 'strong',
    },
  ],
  ecas: [
    [
      { x: 262, y: 424 },
      { x: 340, y: 424 },
      { x: 340, y: 440 },
      { x: 262, y: 440 },
    ],
  ],
  currents: [],
  tutorial: ['straightRoute', 'waypoints', 'wind', 'eca', 'speed'],
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
      // Hugging the islet in the strong wind: wrecked on the coast.
      points: [
        { x: 238, y: 388 },
        { x: 262, y: 336 },
        { x: 306, y: 336 },
        { x: 322, y: 372 },
      ],
      speeds: ['normal', 'normal', 'normal'],
    },
  ],
};
