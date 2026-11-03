import type { LevelDef } from '../../game/levels/types';
import type { PlanningStage } from '../../game/planningState';
import type { Speed, VoyageTotals } from '../../game/types';
import { t } from '../../i18n';
import { el } from './hudLayer';
import { createMetersPanel } from './meter';

export interface PlanningHudCallbacks {
  onUndo(): void;
  onGo(): void;
  onBack(): void;
  onShowTutorial?: () => void;
}

export interface PlanningHudState {
  stage: PlanningStage;
  selectedLeg: number | null;
  speeds: Speed[];
  canUndo: boolean;
  canGo: boolean;
  blocked: boolean;
  totals: VoyageTotals;
}

export type HudHighlight = 'meters' | 'speed' | 'legend-wind' | 'legend-eca' | 'go' | 'undo';

export interface PlanningHud {
  root: HTMLElement;
  update(state: PlanningHudState): void;
  highlight(target: HudHighlight | null): void;
  setGoEnabled(enabled: boolean): void;
  destroy(): void;
}

export function createPlanningHud(level: LevelDef, cb: PlanningHudCallbacks): PlanningHud {
  const s = t();
  const root = el('aside', 'hud-sidebar');

  // Header
  const header = el('div', 'hud-header');
  const back = el('button', 'hud-link', s.hud.backToLevels);
  back.type = 'button';
  back.addEventListener('click', () => cb.onBack());
  header.append(back);
  if (cb.onShowTutorial) {
    const show = el('button', 'hud-link hud-link-small', s.tutorial.showTutorial);
    show.type = 'button';
    show.addEventListener('click', () => cb.onShowTutorial?.());
    header.append(show);
  }

  const meters = createMetersPanel(level);
  const metersBox = el('section', 'hud-section hud-meters');
  metersBox.append(meters.root);

  // Actions
  const actions = el('div', 'hud-actions');
  const undo = el('button', 'hud-btn hud-btn-secondary', s.actions.undo);
  undo.type = 'button';
  undo.addEventListener('click', () => cb.onUndo());
  const go = el('button', 'hud-btn hud-btn-primary', s.actions.go);
  go.type = 'button';
  go.addEventListener('click', () => cb.onGo());
  actions.append(undo, go);

  root.append(header, metersBox, actions);

  let last: PlanningHudState | null = null;
  let goAllowed = true;

  function apply(): void {
    const st = last;
    if (!st) return;
    meters.update(st.totals);

    undo.disabled = !st.canUndo;
    go.disabled = !(st.canGo && goAllowed);
  }

  return {
    root,
    update(state) {
      last = state;
      apply();
    },
    highlight(target) {
      root.querySelectorAll('.hud-highlight').forEach((n) => n.classList.remove('hud-highlight'));
      if (!target) return;
      const node =
        target === 'meters'
          ? metersBox
          : target === 'go'
              ? go
              : target === 'undo'
                ? undo
                : null;
      node?.classList.add('hud-highlight');
    },
    setGoEnabled(enabled) {
      goAllowed = enabled;
      apply();
    },
    destroy() {
      root.remove();
    },
  };
}
