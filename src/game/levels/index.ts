import { level1 } from './level1';
import type { LevelDef } from './types';

export const LEVELS: LevelDef[] = [level1];

export function getLevel(id: number): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level ${id}`);
  return level;
}

export function hasLevel(id: number): boolean {
  return LEVELS.some((l) => l.id === id);
}

export type { LevelDef } from './types';
