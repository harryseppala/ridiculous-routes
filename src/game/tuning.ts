import type { Speed } from './types';
import type { WindStrength } from './levels/types';

/** All balancing knobs. Changing these never requires touching logic. */

/** Base ship speed per setting (knots). */
export const SPEED_KN: Record<Speed, number> = { slow: 12, normal: 16, fast: 20 };

/** Fuel burn multiplier per setting (≈ v², normalised to normal). */
export const SPEED_FACTOR: Record<Speed, number> = { slow: 0.6, normal: 1.0, fast: 1.6 };

/** Nautical miles per world unit. */
export const NM_PER_UNIT = 20;

/** Fuel cost at normal speed, k€ per nm. */
export const FUEL_K_PER_NM = 0.1;

/** CO₂ at normal speed, tonnes per nm. */
export const CO2_T_PER_NM = 0.3;

/** Emission control area: cleaner fuel costs more and emits less. */
export const ECA_PRICE = 1.5;
export const ECA_EMISSION = 0.5;

/** Fraction of along-track wind (kn) added to ship speed. */
export const WIND_SPEED_GAIN = 0.5;
/** Fraction of along-track current (kn) added to ship speed. */
export const CURRENT_SPEED_GAIN = 1.0;
/** Fuel/CO₂ change per knot of along-track wind (tailwind lowers). */
export const WIND_COST_GAIN = 0.02;
/** Along-track wind is clamped to ±this (kn) for the cost term. */
export const WIND_COST_CLAMP_KN = 30;

/** Strong wind closer than this to land wrecks the ship (world units). */
export const COAST_DANGER_UNITS = 6;

/** Simulation step along each leg (world units). */
export const STEP_UNITS = 2;

/** Floor on effective speed (kn) so headwinds never stall the ship. */
export const MIN_EFF_SPEED = 4;

/** Default wind speeds for authoring. */
export const WIND_KNOTS: Record<WindStrength, number> = { light: 10, strong: 25, storm: 40 };

export const WIND_RANK: Record<WindStrength | 'none', number> = { none: 0, light: 1, strong: 2, storm: 3 };
