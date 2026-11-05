import type { TutorialStepId } from '../../game/levels/types';
import { t } from '../../i18n';
import { fill } from '../../i18n/format';
import { el } from './hudLayer';

export interface TutorialCard {
  root: HTMLElement;
  showStep(step: TutorialStepId, n: number, total: number, canContinue: boolean): void;
  showReady(): void;
  showSkip(): void;
  destroy(): void;
}

/** Short instructions above the demonstration, centred within the map. */
export function createTutorialCard(onContinue: () => void): TutorialCard {
  const s = t().tutorial;
  const root = el('div', 'tutorial-card');
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  const step = el('div', 'tutorial-step');
  const text = el('p', 'tutorial-text');
  const cont = el('button', 'hud-btn hud-btn-secondary tutorial-continue', s.continue);
  cont.type = 'button';
  cont.addEventListener('click', onContinue);
  root.append(step, text, cont);

  const swap = (): void => {
    root.classList.remove('is-new');
    void root.offsetWidth;
    root.classList.add('is-new');
  };

  return {
    root,
    showStep(id, n, total, canContinue) {
      if (text.textContent !== s[id]) swap();
      step.textContent = fill(s.step, { n, total });
      text.textContent = s[id];
      cont.hidden = !canContinue;
    },
    showReady() {
      swap();
      step.textContent = '';
      text.textContent = s.ready;
      cont.hidden = true;
    },
    showSkip() {
      cont.textContent = s.skipDemo;
      cont.hidden = false;
    },
    destroy: () => root.remove(),
  };
}
