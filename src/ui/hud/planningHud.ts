import type { LevelDef } from '../../game/levels/types';
import type { PlanningStage } from '../../game/planningState';
import { MAX_ROUTES } from '../../game/routePlans';
import type { Speed, VoyageTotals } from '../../game/types';
import { t } from '../../i18n';
import { fill } from '../../i18n/format';
import { el } from './hudLayer';
import { createMetersPanel } from './meter';

export interface PlanningHudCallbacks {
  onUndo(): void;
  onGo(): void;
  onBack(): void;
  onHighlightWaypoint(index: number): void;
  onAddRoute(): void;
  onSelectRoute(index: number): void;
  onDeleteRoute(index: number): void;
  onShowTutorial?: () => void;
}

export interface PlanningHudState {
  stage: PlanningStage;
  selectedLeg: number | null;
  speeds: Speed[];
  canUndo: boolean;
  canGo: boolean;
  blocked: boolean;
  reason: string | null;
  invalidWaypoint: number | null;
  totals: VoyageTotals;
  routeCount: number;
  selectedRoute: number;
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

  const routes = el('section', 'hud-routes');
  routes.setAttribute('aria-label', s.routes.heading);
  const add = el('button', 'hud-btn hud-btn-secondary hud-add-route', s.routes.add);
  add.type = 'button';
  add.addEventListener('click', () => cb.onAddRoute());
  const limit = el('div', 'hud-note');
  limit.id = 'route-limit';
  add.setAttribute('aria-describedby', limit.id);
  const list = el('div', 'hud-route-list');
  routes.append(add, limit, list);

  const reason = el('button', 'hud-link hud-reason');
  reason.type = 'button';
  reason.addEventListener('click', () => {
    if (last?.invalidWaypoint !== null && last?.invalidWaypoint !== undefined) cb.onHighlightWaypoint(last.invalidWaypoint);
  });
  root.append(header, metersBox, reason, actions, routes);

  let last: PlanningHudState | null = null;
  let goAllowed = true;
  let routeCount = 0;

  function apply(): void {
    const st = last;
    if (!st) return;
    meters.update(st.totals);

    undo.disabled = !st.canUndo;
    go.disabled = !(st.canGo && goAllowed);
    reason.hidden = !st.reason;
    reason.textContent = st.reason ?? '';
    reason.disabled = st.invalidWaypoint === null;
    add.disabled = st.routeCount >= MAX_ROUTES;
    add.title = add.disabled ? fill(s.routes.limit, { n: MAX_ROUTES }) : s.routes.add;
    limit.textContent = add.disabled ? add.title : '';
    limit.hidden = !add.disabled;
    if (routeCount !== st.routeCount) {
      routeCount = st.routeCount;
      list.replaceChildren();
      for (let i = 0; i < routeCount; i++) {
        const row = el('div', 'hud-route-row');
        const name = fill(s.routes.name, { n: i + 1 });
        const select = el('button', 'hud-btn hud-btn-secondary hud-route-select', name);
        select.type = 'button';
        select.addEventListener('click', () => cb.onSelectRoute(i));
        const remove = el('button', 'hud-link hud-route-delete');
        remove.type = 'button';
        remove.setAttribute('aria-label', fill(s.routes.delete, { n: i + 1 }));
        remove.title = routeCount === 1 ? s.routes.keepOne : fill(s.routes.delete, { n: i + 1 });
        remove.disabled = routeCount === 1;
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS(icon.namespaceURI, 'path');
        path.setAttribute('d', 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7');
        icon.append(path);
        remove.append(icon);
        remove.addEventListener('click', () => cb.onDeleteRoute(i));
        row.append(select, remove);
        list.append(row);
      }
    }
    list.querySelectorAll('.hud-route-select').forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === st.selectedRoute));
    });
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
