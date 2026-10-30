import { t } from './index';

/** Replace `{name}` placeholders. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

export function formatCost(costK: number): string {
  return fill(t().units.costK, { v: Math.round(costK) });
}

export function formatCostOf(costK: number, maxK: number): string {
  return fill(t().units.costOf, { v: Math.round(costK), max: Math.round(maxK) });
}

export function formatOf(value: string, max: string): string {
  return fill(t().units.of, { v: value, max });
}

export function formatDuration(hours: number): string {
  const total = Math.round(hours);
  const d = Math.floor(total / 24);
  const h = total % 24;
  const u = t().units;
  if (d === 0) return fill(u.hours, { h });
  if (h === 0) return fill(u.days, { d });
  return fill(u.daysHours, { d, h });
}

export function formatCo2(tonnes: number): string {
  return fill(t().units.co2, { v: Math.round(tonnes) });
}
