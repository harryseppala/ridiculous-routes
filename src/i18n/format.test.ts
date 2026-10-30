import { describe, expect, it } from 'vitest';
import { fill, formatCo2, formatCost, formatCostOf, formatDuration, formatOf } from './format';

describe('formatters', () => {
  it('formatCost rounds to k€', () => {
    expect(formatCost(123.4)).toBe('€ 123k');
    expect(formatCost(0)).toBe('€ 0k');
    expect(formatCostOf(123.4, 150)).toBe('€ 123k / 150k');
    expect(formatOf('5 d 4 h', '7 d')).toBe('5 d 4 h / 7 d');
  });

  it('formatDuration uses days and hours', () => {
    expect(formatDuration(5)).toBe('5 h');
    expect(formatDuration(24)).toBe('1 d');
    expect(formatDuration(124.4)).toBe('5 d 4 h');
    expect(formatDuration(167.6)).toBe('7 d');
  });

  it('formatCo2 rounds to tonnes', () => {
    expect(formatCo2(411.6)).toBe('412 t CO₂');
  });

  it('fill leaves unknown placeholders', () => {
    expect(fill('{a}-{b}', { a: 1 })).toBe('1-{b}');
  });
});
