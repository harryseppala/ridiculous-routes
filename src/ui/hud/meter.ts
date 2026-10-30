import { formatCo2, formatCostOf, formatDuration, formatOf } from '../../i18n/format';
import { t } from '../../i18n';
import type { LevelDef } from '../../game/levels/types';
import type { VoyageTotals } from '../../game/types';
import { el } from './hudLayer';

type MeterState = 'ok' | 'warn' | 'over';

interface Meter {
  root: HTMLElement;
  update(value: number, text: string, state: MeterState): void;
}

const NEAR = 0.9;

function createMeter(label: string, scaleMax: number, markers: { at: number; kind: 'limit' | 'target' }[]): Meter {
  const root = el('div', 'meter');
  const head = el('div', 'meter-head');
  const name = el('span', 'meter-label', label);
  const value = el('span', 'meter-value');
  head.append(name, value);
  const track = el('div', 'meter-track');
  const fill = el('div', 'meter-fill');
  track.append(fill);
  for (const m of markers) {
    const mark = el('div', `meter-marker meter-marker-${m.kind}`);
    mark.style.left = `${Math.min(100, (m.at / scaleMax) * 100)}%`;
    mark.title = m.kind === 'limit' ? t().hud.limit : t().hud.target;
    track.append(mark);
  }
  root.append(head, track);
  return {
    root,
    update(v, text, state) {
      value.textContent = text;
      fill.style.width = `${Math.min(100, (v / scaleMax) * 100)}%`;
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
  const root = el('div', 'meters');
  const budget = createMeter(s.meters.budget, level.budgetK * 1.15, [
    { at: level.costTargetK, kind: 'target' },
    { at: level.budgetK, kind: 'limit' },
  ]);
  const time = createMeter(s.meters.time, level.deadlineH * 1.15, [{ at: level.deadlineH, kind: 'limit' }]);
  const co2Max = level.co2TargetT * 1.6;
  const co2 = createMeter(s.meters.emissions, co2Max, [{ at: level.co2TargetT, kind: 'target' }]);
  root.append(budget.root, time.root, co2.root);

  return {
    root,
    update(totals) {
      budget.update(
        totals.costK,
        formatCostOf(totals.costK, level.budgetK),
        stateFor(totals.costK, level.budgetK, level.costTargetK)
      );
      time.update(
        totals.hours,
        formatOf(formatDuration(totals.hours), formatDuration(level.deadlineH)),
        stateFor(totals.hours, level.deadlineH)
      );
      co2.update(totals.co2T, formatCo2(totals.co2T), stateFor(totals.co2T, level.co2TargetT));
    },
  };
}
