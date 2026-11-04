import type { Route, Sample, Speed } from './types';

/** Visual timing only; simulated voyage time and scoring remain unchanged. */
export const ANIMATION_TIME_FACTOR: Record<Speed, number> = {
  slow: 1.6,
  normal: 1,
  fast: 0.55,
};

export function sailingAnimationTimes(samples: readonly Sample[], route: Route, msPerHour: number): number[] {
  const times = samples.length ? [0] : [];
  for (let i = 1; i < samples.length; i++) {
    const speed = route.speeds[samples[i].legIndex] ?? 'normal';
    times.push(times[i - 1] + (samples[i].hours - samples[i - 1].hours) * msPerHour * ANIMATION_TIME_FACTOR[speed]);
  }
  return times;
}
