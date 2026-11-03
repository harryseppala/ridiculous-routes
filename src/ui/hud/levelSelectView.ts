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
  header.append(back, el('h1', 'ls-heading', s.levelSelect.heading));
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
    marker.append(badge, stars);

    if (m.unlocked) marker.addEventListener('click', () => cb.onSelect(m.level.id));
    root.append(marker);
  }
  return root;
}
