import type { Stars } from './types';

export const PROGRESS_STORAGE_KEY = 'ridiculous-routes:progress:v1';

export interface ProgressData {
  stars: Record<number, Stars>;
  tutorialDone: boolean;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const defaults = (): ProgressData => ({ stars: {}, tutorialDone: false });

function isStars(v: unknown): v is Stars {
  return v === 0 || v === 1 || v === 2 || v === 3;
}

export class ProgressStore {
  constructor(private readonly storage: KeyValueStorage | undefined) {}

  load(): ProgressData {
    try {
      const raw = this.storage?.getItem(PROGRESS_STORAGE_KEY);
      if (!raw) return defaults();
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return defaults();
      const obj = parsed as Partial<ProgressData>;
      const stars: Record<number, Stars> = {};
      if (obj.stars && typeof obj.stars === 'object') {
        for (const [k, v] of Object.entries(obj.stars)) {
          const id = Number(k);
          if (Number.isInteger(id) && isStars(v)) stars[id] = v;
        }
      }
      return { stars, tutorialDone: obj.tutorialDone === true };
    } catch {
      return defaults();
    }
  }

  private save(data: ProgressData): void {
    try {
      this.storage?.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable: progress is simply not persisted.
    }
  }

  getStars(id: number): Stars {
    return this.load().stars[id] ?? 0;
  }

  /** Keeps the best result. Returns true when it improved. */
  recordResult(id: number, stars: Stars): boolean {
    const data = this.load();
    const prev = data.stars[id] ?? 0;
    if (stars <= prev) return false;
    data.stars[id] = stars;
    this.save(data);
    return true;
  }

  isUnlocked(id: number): boolean {
    if (id <= 1) return true;
    return this.getStars(id - 1) >= 1;
  }

  isTutorialDone(): boolean {
    return this.load().tutorialDone;
  }

  setTutorialDone(done: boolean): void {
    const data = this.load();
    data.tutorialDone = done;
    this.save(data);
  }
}

function browserStorage(): KeyValueStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export const progress = new ProgressStore(browserStorage());
