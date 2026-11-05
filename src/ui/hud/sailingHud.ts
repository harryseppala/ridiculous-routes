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

/** Read-only meters with normal, fast and extra-fast playback. */
export function createSailingHud(level: LevelDef, onFastForward: (speed: number) => void): SailingHud {
  const s = t();
  const root = el('aside', 'hud-sidebar');
  const meters = createMetersPanel(level);
  const box = el('section', 'hud-section');
  box.append(meters.root);

  const actions = el('div', 'hud-actions');
  const speeds = [1, 2, 4] as const;
  let speedIndex = 0;
  const ff = el('button', 'hud-btn hud-btn-secondary', `${s.hud.fastForward} 1x`);
  ff.type = 'button';
  ff.setAttribute('aria-pressed', 'false');
  ff.addEventListener('click', () => {
    speedIndex = (speedIndex + 1) % speeds.length;
    const speed = speeds[speedIndex];
    ff.textContent = `${s.hud.fastForward} ${speed}x`;
    ff.setAttribute('aria-pressed', String(speed !== 1));
    ff.classList.toggle('is-on', speed !== 1);
    onFastForward(speed);
  });
  actions.append(ff);

  root.append(box, actions);
  return {
    root,
    update: (totals) => meters.update(totals),
    destroy: () => root.remove(),
  };
}
