import type { LevelDef } from '../../game/levels/types';
import type { VoyageTotals } from '../../game/types';
import { t } from '../../i18n';
import { fill, formatCo2, formatCost } from '../../i18n/format';
import { el } from './hudLayer';
import { createMetersPanel } from './meter';

export interface SailingHud {
  root: HTMLElement;
  update(totals: VoyageTotals): void;
  destroy(): void;
}

/** Read-only meters while the ship sails, plus a fast-forward toggle. */
export function createSailingHud(level: LevelDef, onFastForward: (on: boolean) => void): SailingHud {
  const s = t();
  const root = el('aside', 'hud-sidebar');
  const title = el('div', 'hud-title');
  title.append(
    el('div', 'hud-level-label', fill(s.hud.levelLabel, { n: level.id })),
    el('div', 'hud-level-name', s.levels[level.textKey].title)
  );
  const status = el('div', 'hud-hint hud-sailing', s.hud.sailing);
  const meters = createMetersPanel(level);
  const targets = el(
    'div',
    'hud-targets',
    fill(s.hud.targets, { cost: formatCost(level.costTargetK), co2: formatCo2(level.co2TargetT) })
  );
  const box = el('section', 'hud-section');
  box.append(meters.root, targets);

  const actions = el('div', 'hud-actions');
  const ff = el('button', 'hud-btn hud-btn-secondary', `${s.hud.fastForward} ▶▶`);
  ff.type = 'button';
  ff.setAttribute('aria-pressed', 'false');
  ff.addEventListener('click', () => {
    const on = ff.getAttribute('aria-pressed') !== 'true';
    ff.setAttribute('aria-pressed', String(on));
    ff.classList.toggle('is-on', on);
    onFastForward(on);
  });
  actions.append(ff);

  root.append(title, status, box, actions);
  return {
    root,
    update: (totals) => meters.update(totals),
    destroy: () => root.remove(),
  };
}
