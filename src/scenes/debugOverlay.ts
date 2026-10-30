import Phaser from 'phaser';
import type { LevelDef } from '../game/levels/types';
import { WORLD } from '../game/world';
import { PALETTE } from '../ui/palette';
import { LAND_DEBUG_KEY } from './mapView';

export function isDebugEnabled(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
}

/**
 * Level authoring aid (`?debug=1`): cursor world coordinates, land-mask tint,
 * zone outlines and the reference route. No effect without the query param.
 */
export function attachDebugOverlay(scene: Phaser.Scene, level?: LevelDef): void {
  if (!isDebugEnabled()) return;

  if (scene.textures.exists(LAND_DEBUG_KEY)) {
    scene.add.image(0, 0, LAND_DEBUG_KEY).setOrigin(0).setScale(1 / WORLD.maskScale).setDepth(50);
  }

  if (level) {
    const g = scene.add.graphics().setDepth(51);
    g.lineStyle(1, 0xffff00, 1);
    for (const z of level.windZones) g.strokePoints(z.polygon, true);
    g.lineStyle(1, PALETTE.eca, 1);
    for (const e of level.ecas) g.strokePoints(e, true);
    g.lineStyle(1, PALETTE.current, 1);
    for (const c of level.currents) g.strokePoints(c.polygon, true);
    g.lineStyle(1, 0xff00ff, 1);
    g.strokePoints(level.referenceRoute.points, false);
    for (const bad of level.badRoutes ?? []) {
      g.lineStyle(1, 0xff8800, 0.8);
      g.strokePoints(bad.points, false);
    }
    g.lineStyle(1, 0xffffff, 0.6);
    g.strokeRect(level.viewport.x, level.viewport.y, level.viewport.w, level.viewport.h);
  }

  const label = document.createElement('div');
  label.style.cssText =
    'position:fixed;left:8px;bottom:8px;z-index:100;padding:4px 8px;font:12px monospace;' +
    'background:rgba(0,0,0,.7);color:#fff;pointer-events:none;';
  document.body.appendChild(label);
  scene.events.once('shutdown', () => label.remove());

  scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    const p = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    label.textContent = `world ${p.x.toFixed(1)}, ${p.y.toFixed(1)}  zoom ${scene.cameras.main.zoom.toFixed(2)}`;
  });
}
