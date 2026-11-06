import { formatCo2, formatCost, formatDuration } from '../../i18n/format';
import { t } from '../../i18n';
import type { LevelDef } from '../../game/levels/types';
import type { VoyageTotals } from '../../game/types';
import { el } from './hudLayer';

type MeterState = 'ok' | 'warn' | 'over';

interface Marker {
  at: number;
  kind: 'limit' | 'target';
  text: string;
  hint: string;
}

interface Meter {
  root: HTMLElement;
  update(value: number, text: string, state: MeterState): void;
}

const NEAR = 0.9;
// Below this share of the track the value no longer fits inside the fill.
const VALUE_INSIDE_FROM = 0.28;

function createMeter(label: string, scaleMax: number, markers: Marker[]): Meter {
  const root = el('div', 'meter');
  const name = el('div', 'meter-label', label);
  const track = el('div', 'meter-track');
  const bar = el('div', 'meter-fill');
  const value = el('span', 'meter-value');
  track.append(bar, value);

  const pct = (at: number): number => Math.min(100, (at / scaleMax) * 100);
  const limit = markers.find((m) => m.kind === 'limit');
  const target = markers.find((m) => m.kind === 'target');
  const limitPct = limit ? pct(limit.at) : 100;
  track.style.setProperty('--limit', `${limitPct}%`);
  track.style.setProperty('--target', `${target ? pct(target.at) : limitPct}%`);

  const flags = el('div', 'meter-flags');
  for (const m of markers) {
    const mark = el('div', `meter-marker meter-marker-${m.kind}`);
    mark.style.left = `${pct(m.at)}%`;
    track.append(mark);

    const flag = el('div', `meter-flag meter-flag-${m.kind}`, m.text);
    flag.style.setProperty('--at', `${pct(m.at)}%`);
    flag.title = m.hint;
    flags.append(flag);
  }
  root.append(name, flags, track);

  return {
    root,
    update(v, text, state) {
      const share = Math.min(1, v / scaleMax);
      value.textContent = text;
      value.classList.toggle('meter-value-outside', share < VALUE_INSIDE_FROM);
      value.style.left = `${share * 100}%`;
      bar.style.width = `${share * 100}%`;
      track.setAttribute('role', 'img');
      track.setAttribute('aria-label', `${label}: ${text}`);
      root.dataset.state = state;
    },
  };
}

function stateFor(value: number, limit: number, softTarget?: number): MeterState {
  if (value > limit) return 'over';
  if (value >= limit * NEAR || (softTarget !== undefined && value > softTarget)) return 'warn';
  return 'ok';
}

export interface MetersPanel {
  root: HTMLElement;
  update(totals: VoyageTotals): void;
}

/** Budget / time / emissions meters against the level's limits and targets. */
export function createMetersPanel(level: LevelDef): MetersPanel {
  const s = t();
  const m = s.meters;
  const root = el('div', 'meters');
  const budget = createMeter(m.budget, level.budgetK * 1.15, [
    { at: level.costTargetK, kind: 'target', text: formatCost(level.costTargetK), hint: m.starHint2 },
    { at: level.budgetK, kind: 'limit', text: formatCost(level.budgetK), hint: m.limitHint },
  ]);
  const time = createMeter(m.time, level.deadlineH * 1.15, [
    { at: level.deadlineH, kind: 'limit', text: formatDuration(level.deadlineH), hint: m.limitHint },
  ]);
  const co2 = createMeter(m.emissions, level.co2TargetT * 1.6, [
    { at: level.co2TargetT, kind: 'target', text: formatCo2(level.co2TargetT), hint: m.starHint3 },
  ]);
  root.append(budget.root, time.root, co2.root);

  return {
    root,
    update(totals) {
      budget.update(totals.costK, formatCost(totals.costK), stateFor(totals.costK, level.budgetK, level.costTargetK));
      time.update(totals.hours, formatDuration(totals.hours), stateFor(totals.hours, level.deadlineH));
      co2.update(totals.co2T, formatCo2(totals.co2T), stateFor(totals.co2T, level.co2TargetT));
    },
  };
}
