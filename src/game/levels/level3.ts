import { roundPolygonCorners } from '../geometry';
import type { LevelDef } from './types';

/** Wind & storms: the short way is into a headwind; a tailwind detour wins; storms by a coast wreck ships. */
export const level3: LevelDef = {
  id: 3,
  textKey: 'l3',
  viewport: { x: 700, y: 290, w: 190, h: 139.6 },
  start: { x: 770, y: 405 },
  end: { x: 858, y: 332 },
  budgetK: 420,
  deadlineH: 185,
  costTargetK: 250,
  co2TargetT: 870,
  windZones: [
    {
      // Headwind over the direct crossing.
      polygon: roundPolygonCorners([
        { x: 799.3, y: 393.3 },
        { x: 786.5, y: 377.9 },
        { x: 836.8, y: 336.5 },
        { x: 849.6, y: 351.9 },
      ]),
      dir: { x: -0.77, y: 0.64 },
      knots: 22,
      strength: 'strong',
      weather: { fromHour: 0, toHour: 60, fromIntensity: 0.7, toIntensity: 1 },
    },
    {
      // Tailwind up the eastern side.
      polygon: roundPolygonCorners([
        { x: 825, y: 412 },
        { x: 852, y: 412 },
        { x: 874, y: 342 },
        { x: 848, y: 339 },
      ]),
      dir: { x: 0.32, y: -0.95 },
      knots: 25,
      strength: 'strong',
    },
    {
      // Storm against the island's southern coast.
      polygon: roundPolygonCorners([
        { x: 758, y: 345 },
        { x: 806, y: 345 },
        { x: 806, y: 369 },
        { x: 758, y: 369 },
      ]),
      dir: { x: 0, y: -1 },
      knots: 40,
      strength: 'storm',
    },
  ],
  ecas: [],
  currents: [],
  referenceRoute: {
    points: [
      { x: 770, y: 405 },
      { x: 835, y: 400 },
      { x: 858, y: 332 },
    ],
    speeds: ['normal', 'normal'],
  },
  badRoutes: [
    {
      points: [
        { x: 770, y: 405 },
        { x: 787, y: 363 },
        { x: 858, y: 332 },
      ],
      speeds: ['normal', 'normal'],
    },
  ],
};
