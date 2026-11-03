import type { LevelDef } from '../../game/levels/types';
import type { VoyageTotals } from '../../game/types';
import { t } from '../../i18n';
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
  const meters = createMetersPanel(level);
  const box = el('section', 'hud-section');
  box.append(meters.root);

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

  root.append(box, actions);
  return {
    root,
    update: (totals) => meters.update(totals),
    destroy: () => root.remove(),
  };
}
