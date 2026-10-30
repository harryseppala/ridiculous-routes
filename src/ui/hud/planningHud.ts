import type { LevelDef } from '../../game/levels/types';
import type { PlanningStage } from '../../game/planningState';
import { SPEEDS, type Speed, type VoyageTotals } from '../../game/types';
import { t } from '../../i18n';
import { fill, formatCost, formatCo2 } from '../../i18n/format';
import { el } from './hudLayer';
import { createMetersPanel } from './meter';

export interface PlanningHudCallbacks {
  onSpeed(speed: Speed, allLegs: boolean): void;
  onUndo(): void;
  onGo(): void;
  onBack(): void;
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
  const names = s.levels[level.textKey];
  const root = el('aside', 'hud-sidebar');

  // Header
  const header = el('div', 'hud-header');
  const back = el('button', 'hud-link', s.hud.backToLevels);
  back.type = 'button';
  back.addEventListener('click', () => cb.onBack());
  const title = el('div', 'hud-title');
  title.append(el('div', 'hud-level-label', fill(s.hud.levelLabel, { n: level.id })), el('div', 'hud-level-name', names.title));
  header.append(back, title);

  const hint = el('div', 'hud-hint');

  // Meters
  const meters = createMetersPanel(level);
  const targets = el(
    'div',
    'hud-targets',
    fill(s.hud.targets, { cost: formatCost(level.costTargetK), co2: formatCo2(level.co2TargetT) })
  );
  const metersBox = el('section', 'hud-section hud-meters');
  metersBox.append(meters.root, targets);

  // Speed
  const speedBox = el('section', 'hud-section hud-speed');
  const speedHead = el('div', 'hud-section-head');
  const speedTitle = el('span', '', s.hud.legSpeed);
  const allLabel = el('label', 'hud-toggle');
  const allInput = el('input');
  allInput.type = 'checkbox';
  allLabel.append(allInput, document.createTextNode(` ${s.hud.allLegs}`));
  speedHead.append(speedTitle, allLabel);
  const speedButtons = el('div', 'speed-buttons');
  const allowed = level.allowedSpeeds ?? SPEEDS;
  const buttons = new Map<Speed, HTMLButtonElement>();
  for (const sp of SPEEDS) {
    if (!allowed.includes(sp)) continue;
    const b = el('button', `speed-btn speed-${sp}`, s.speed[sp]);
    b.type = 'button';
    b.addEventListener('click', () => cb.onSpeed(sp, allInput.checked));
    buttons.set(sp, b);
    speedButtons.append(b);
  }
  const speedNote = el('div', 'hud-note');
  speedBox.append(speedHead, speedButtons, speedNote);
  allInput.addEventListener('change', () => apply());

  // Legend
  const legend = el('section', 'hud-section hud-legend');
  legend.append(el('div', 'hud-section-head', s.legend.title));
  const legendList = el('div', 'legend-grid');
  const item = (swatch: string, label: string, key?: string): void => {
    const row = el('div', 'legend-item');
    if (key) row.dataset.key = key;
    row.append(el('span', `swatch ${swatch}`), el('span', '', label));
    legendList.append(row);
  };
  item('sw-land', s.legend.land);
  item('sw-sea', s.legend.sea);
  if (level.windZones.some((z) => z.strength === 'strong')) item('sw-strong', s.legend.strongWind, 'wind');
  if (level.windZones.some((z) => z.strength === 'storm')) item('sw-storm', s.legend.storm, 'wind');
  if (level.windZones.length > 0) item('sw-arrow', s.legend.wind, 'wind');
  if (level.ecas.length > 0) item('sw-eca', s.legend.eca, 'eca');
  if (level.currents.length > 0) item('sw-current', s.legend.current);
  for (const sp of allowed) item(`sw-route sw-${sp}`, s.speed[sp]);
  item('sw-route sw-blocked', s.legend.blocked);
  legend.append(legendList);

  // Actions
  const actions = el('div', 'hud-actions');
  const undo = el('button', 'hud-btn hud-btn-secondary', s.actions.undo);
  undo.type = 'button';
  undo.addEventListener('click', () => cb.onUndo());
  const go = el('button', 'hud-btn hud-btn-primary', s.actions.go);
  go.type = 'button';
  go.addEventListener('click', () => cb.onGo());
  actions.append(undo, go);

  root.append(header, hint, metersBox, speedBox, legend, actions);

  let last: PlanningHudState | null = null;
  let goAllowed = true;

  function apply(): void {
    const st = last;
    if (!st) return;
    hint.textContent = st.blocked ? s.hints.blocked : s.hints[st.stage];
    hint.dataset.state = st.blocked ? 'warn' : '';
    meters.update(st.totals);

    const hasLegs = st.speeds.length > 0;
    const all = allInput.checked;
    const active: Speed | null = all
      ? st.speeds.every((x) => x === st.speeds[0]) && hasLegs
        ? st.speeds[0]
        : null
      : st.selectedLeg !== null
        ? st.speeds[st.selectedLeg] ?? null
        : null;
    const enabled = hasLegs && (all || st.selectedLeg !== null);
    for (const [sp, b] of buttons) {
      b.disabled = !enabled;
      b.classList.toggle('is-active', enabled && active === sp);
    }
    allInput.disabled = !hasLegs;
    speedNote.textContent = enabled ? '' : s.hud.selectLeg;

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
          : target === 'speed'
            ? speedBox
            : target === 'go'
              ? go
              : target === 'undo'
                ? undo
                : legendList.querySelector(`[data-key="${target === 'legend-wind' ? 'wind' : 'eca'}"]`);
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
