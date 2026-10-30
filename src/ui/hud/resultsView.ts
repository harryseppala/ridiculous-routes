import type { LevelDef } from '../../game/levels/types';
import type { VoyageResult } from '../../game/types';
import { t } from '../../i18n';
import { formatCo2, formatCost, formatDuration } from '../../i18n/format';
import { el } from './hudLayer';

export interface ResultsCallbacks {
  onRetry(): void;
  onLevels(): void;
  onNext?: () => void;
}

/** Results overlay: animated stars and values vs limits/targets. */
export function createResultsView(
  level: LevelDef,
  result: VoyageResult,
  improved: boolean,
  cb: ResultsCallbacks
): HTMLElement {
  const s = t();
  const { totals } = result;
  const root = el('div', 'overlay');
  const card = el('div', 'overlay-card');
  root.append(card);

  card.append(el('h2', 'overlay-title', s.results.title));

  const stars = el('div', 'stars');
  for (let i = 0; i < 3; i++) {
    const star = el('span', `star${i < result.stars ? ' is-earned' : ''}`, '★');
    star.style.animationDelay = `${0.25 + i * 0.35}s`;
    stars.append(star);
  }
  card.append(stars);
  if (improved) card.append(el('div', 'new-best', s.results.newBest));

  const table = el('table', 'results-table');
  const head = el('tr');
  head.append(el('th', '', s.results.metric), el('th', '', s.results.yours), el('th', '', s.results.goal), el('th'));
  table.append(head);
  const row = (label: string, yours: string, goal: string, ok: boolean): void => {
    const tr = el('tr', ok ? 'is-ok' : 'is-miss');
    tr.append(el('td', '', label), el('td', '', yours), el('td', '', `≤ ${goal}`), el('td', 'mark', ok ? '✓' : '✗'));
    table.append(tr);
  };
  row(s.results.budgetLimit, formatCost(totals.costK), formatCost(level.budgetK), totals.costK <= level.budgetK);
  row(s.results.deadline, formatDuration(totals.hours), formatDuration(level.deadlineH), totals.hours <= level.deadlineH);
  row(s.results.costTarget, formatCost(totals.costK), formatCost(level.costTargetK), totals.costK <= level.costTargetK);
  row(s.results.co2Target, formatCo2(totals.co2T), formatCo2(level.co2TargetT), totals.co2T <= level.co2TargetT);
  card.append(table);

  const actions = el('div', 'overlay-actions');
  const button = (label: string, cls: string, fn: () => void): HTMLButtonElement => {
    const b = el('button', `hud-btn ${cls}`, label);
    b.type = 'button';
    b.addEventListener('click', fn);
    actions.append(b);
    return b;
  };
  button(s.actions.levels, 'hud-btn-secondary', cb.onLevels);
  const retry = button(s.actions.retry, 'hud-btn-secondary', cb.onRetry);
  const primary = cb.onNext ? button(s.actions.next, 'hud-btn-primary', cb.onNext) : retry;
  queueMicrotask(() => primary.focus());
  card.append(actions);
  return root;
}
