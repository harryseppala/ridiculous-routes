import type { FailReason } from '../../game/types';
import { t } from '../../i18n';
import { el } from './hudLayer';

export interface GameOverCallbacks {
  onRetry(): void;
  onLevels(): void;
}

/** Game-over overlay: one-line reason, Retry and Levels. No tips. */
export function createGameOverView(reason: FailReason, cb: GameOverCallbacks): HTMLElement {
  const s = t();
  const root = el('div', 'overlay overlay-fail');
  const card = el('div', 'overlay-card');
  root.append(card);
  card.append(el('h2', 'overlay-title', s.gameOverScreen.title), el('p', 'overlay-reason', s.gameOver[reason]));

  const actions = el('div', 'overlay-actions');
  const levels = el('button', 'hud-btn hud-btn-secondary', s.actions.levels);
  levels.type = 'button';
  levels.addEventListener('click', cb.onLevels);
  const retry = el('button', 'hud-btn hud-btn-primary', s.actions.retry);
  retry.type = 'button';
  retry.addEventListener('click', cb.onRetry);
  actions.append(levels, retry);
  card.append(actions);
  queueMicrotask(() => retry.focus());
  return root;
}
