import { describe, expect, it } from 'vitest';
import { PROGRESS_STORAGE_KEY, ProgressStore, type KeyValueStorage } from './progress';

function memoryStorage(initial?: string): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(PROGRESS_STORAGE_KEY, initial);
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe('ProgressStore', () => {
  it('defaults on empty storage', () => {
    const p = new ProgressStore(memoryStorage());
    expect(p.getStars(1)).toBe(0);
    expect(p.isTutorialDone()).toBe(false);
  });

  it('keeps the best stars', () => {
    const p = new ProgressStore(memoryStorage());
    expect(p.recordResult(1, 2)).toBe(true);
    expect(p.recordResult(1, 1)).toBe(false);
    expect(p.getStars(1)).toBe(2);
    p.recordResult(1, 3);
    expect(p.getStars(1)).toBe(3);
  });

  it('unlocks sequentially', () => {
    const p = new ProgressStore(memoryStorage());
    expect(p.isUnlocked(1)).toBe(true);
    expect(p.isUnlocked(2)).toBe(false);
    p.recordResult(1, 0);
    expect(p.isUnlocked(2)).toBe(false);
    p.recordResult(1, 1);
    expect(p.isUnlocked(2)).toBe(true);
    expect(p.isUnlocked(3)).toBe(false);
  });

  it('survives corrupt JSON and bad values', () => {
    expect(new ProgressStore(memoryStorage('{not json')).getStars(1)).toBe(0);
    const p = new ProgressStore(memoryStorage(JSON.stringify({ stars: { 1: 7, 2: 2, x: 3 }, tutorialDone: 'yes' })));
    expect(p.getStars(1)).toBe(0);
    expect(p.getStars(2)).toBe(2);
    expect(p.isTutorialDone()).toBe(false);
  });

  it('persists tutorial flag', () => {
    const s = memoryStorage();
    new ProgressStore(s).setTutorialDone(true);
    expect(new ProgressStore(s).isTutorialDone()).toBe(true);
  });

  it('works without storage', () => {
    const p = new ProgressStore(undefined);
    p.recordResult(1, 3);
    expect(p.getStars(1)).toBe(0);
  });
});
