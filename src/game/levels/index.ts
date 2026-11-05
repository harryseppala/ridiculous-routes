import { level1 } from './level1';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import { level6 } from './level6';
import { level7 } from './level7';
import type { LevelDef } from './types';

export const LEVELS: LevelDef[] = [
  level1,
  { ...level5, id: 2 },
  level3,
  level4,
  { ...level6, id: 5 },
  { ...level7, id: 6 },
];

export function getLevel(id: number): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level ${id}`);
  return level;
}

export function hasLevel(id: number): boolean {
  return LEVELS.some((l) => l.id === id);
}

export type { LevelDef } from './types';
