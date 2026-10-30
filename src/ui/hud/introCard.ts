import type { LevelDef } from '../../game/levels/types';
import { t } from '../../i18n';
import { fill } from '../../i18n/format';
import { el } from './hudLayer';

/** One short card introducing the level's new element, shown before planning. */
export function createIntroCard(level: LevelDef, onStart: () => void): HTMLElement {
  const s = t();
  const names = s.levels[level.textKey];
  const root = el('div', 'overlay overlay-intro');
  const card = el('div', 'overlay-card intro-card');
  root.append(card);
  card.append(
    el('div', 'hud-level-label', fill(s.hud.levelLabel, { n: level.id })),
    el('h2', 'overlay-title', names.title),
    el('div', 'intro-new', `${s.intro.newLabel}: ${names.newElement}`),
    el('p', 'intro-text', names.intro)
  );
  const actions = el('div', 'overlay-actions');
  const start = el('button', 'hud-btn hud-btn-primary', s.intro.start);
  start.type = 'button';
  start.addEventListener('click', onStart);
  actions.append(start);
  card.append(actions);
  queueMicrotask(() => start.focus());
  return root;
}
