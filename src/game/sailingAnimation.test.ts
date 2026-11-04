import { describe, expect, it } from 'vitest';
import { sailingAnimationTimes } from './sailingAnimation';
import type { Sample, Speed } from './types';

const sample = (hours: number, legIndex: number): Sample => ({
  pos: { x: hours, y: 0 }, legIndex, hours, costK: hours, co2T: hours,
});

describe('sailing animation timing', () => {
  it('makes speed differences more visible without changing simulated hours', () => {
    const samples = [sample(0, 0), sample(10, 0)];
    const duration = (speed: Speed) => sailingAnimationTimes(samples, { points: [], speeds: [speed] }, 60)[1];
    expect(duration('slow')).toBe(960);
    expect(duration('normal')).toBe(600);
    expect(duration('fast')).toBe(330);
    expect(samples[1].hours).toBe(10);
  });

  it('uses the speed of each sample’s leg', () => {
    const samples = [sample(0, 0), sample(10, 0), sample(20, 1)];
    expect(sailingAnimationTimes(samples, { points: [], speeds: ['slow', 'fast'] }, 60)).toEqual([0, 960, 1290]);
  });
});
