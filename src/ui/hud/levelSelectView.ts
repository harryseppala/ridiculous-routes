import type { LevelDef } from '../../game/levels/types';
import type { Stars, Vec } from '../../game/types';
import { t } from '../../i18n';
import { fill } from '../../i18n/format';
import { el } from './hudLayer';

export interface LevelMarker {
  level: LevelDef;
  /** Position in 1280×720 game space. */
  screen: Vec;
  stars: Stars;
  unlocked: boolean;
}

export interface LevelSelectCallbacks {
  onSelect(id: number): void;
  onHover(id: number | null): void;
  onBack(): void;
}

export function starString(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

/** Header + one marker per level on the world map. */
export function createLevelSelectView(markers: LevelMarker[], cb: LevelSelectCallbacks): HTMLElement {
  const s = t();
  const root = el('div', 'level-select');

  const header = el('header', 'ls-header');
  const back = el('button', 'hud-link ls-back', `← ${s.levelSelect.backToTitle}`);
  back.type = 'button';
  back.addEventListener('click', () => cb.onBack());
  header.append(back, el('h1', 'ls-heading', s.levelSelect.heading), el('p', 'ls-subtitle', s.levelSelect.subtitle));
  root.append(header);

  for (const m of markers) {
    const names = s.levels[m.level.textKey];
    const marker = el('button', `ls-marker${m.unlocked ? '' : ' is-locked'}`);
    marker.type = 'button';
    marker.style.left = `${m.screen.x}px`;
    marker.style.top = `${m.screen.y}px`;
    marker.disabled = !m.unlocked;
    marker.setAttribute('aria-label', `${fill(s.hud.levelLabel, { n: m.level.id })}: ${names.title}`);

    const badge = el('span', 'ls-badge', m.unlocked ? String(m.level.id) : '🔒');
    const stars = el('span', 'ls-stars', starString(m.stars));
    const tip = el('span', 'ls-tip');
    tip.append(
      el('strong', '', `${fill(s.hud.levelLabel, { n: m.level.id })} · ${names.title}`),
      el('span', '', m.unlocked ? fill(s.levelSelect.newElement, { element: names.newElement }) : s.levelSelect.locked)
    );
    marker.append(badge, stars, tip);

    // Locked markers still show their tooltip on hover but are not clickable.
    const hoverTarget = m.unlocked ? marker : wrapForHover(marker);
    hoverTarget.addEventListener('mouseenter', () => cb.onHover(m.level.id));
    hoverTarget.addEventListener('mouseleave', () => cb.onHover(null));
    if (m.unlocked) marker.addEventListener('click', () => cb.onSelect(m.level.id));
    root.append(hoverTarget);
  }
  return root;
}

function wrapForHover(marker: HTMLElement): HTMLElement {
  const wrap = el('div', 'ls-marker-wrap');
  wrap.style.left = marker.style.left;
  wrap.style.top = marker.style.top;
  marker.style.left = '0';
  marker.style.top = '0';
  wrap.append(marker);
  return wrap;
}
