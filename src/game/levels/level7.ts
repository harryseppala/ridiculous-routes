import { roundPolygonCorners } from '../geometry';
import type { LevelDef } from './types';

/** The grand passage: storm in the island channel, a helpful current, a regulated area and a tight schedule. */
export const level7: LevelDef = {
  id: 7,
  textKey: 'l7',
  viewport: { x: 0, y: 20, w: 220, h: 161.6 },
  start: { x: 12, y: 140 },
  end: { x: 205, y: 110 },
  budgetK: 520,
  deadlineH: 235,
  costTargetK: 385,
  co2TargetT: 890,
  windZones: [
    {
      polygon: roundPolygonCorners([
        { x: 48, y: 98 },
        { x: 128, y: 98 },
        { x: 128, y: 124 },
        { x: 48, y: 124 },
      ]),
      dir: { x: 0.6, y: 0.8 },
      knots: 40,
      strength: 'storm',
      weather: { fromHour: 80, toHour: 150, fromIntensity: 1, toIntensity: 0 },
    },
  ],
  ecas: [
    [
      { x: 168, y: 94 },
      { x: 220, y: 94 },
      { x: 220, y: 130 },
      { x: 168, y: 130 },
    ],
  ],
  currents: [
    {
      polygon: [
        { x: 0, y: 143 },
        { x: 128, y: 143 },
        { x: 128, y: 158 },
        { x: 0, y: 158 },
      ],
      dir: { x: 1, y: 0 },
      knots: 7,
    },
  ],
  referenceRoute: {
    points: [
      { x: 12, y: 140 },
      { x: 30, y: 150 },
      { x: 125, y: 147 },
      { x: 205, y: 110 },
    ],
    speeds: ['normal', 'slow', 'normal'],
  },
  badRoutes: [
    {
      points: [
        { x: 12, y: 140 },
        { x: 45, y: 118 },
        { x: 140, y: 112 },
        { x: 205, y: 110 },
      ],
      speeds: ['normal', 'normal', 'normal'],
    },
  ],
};
