import Phaser from 'phaser';
import { LEVELS } from '../game/levels';
import { progress } from '../game/progress';
import { rectCenter, WORLD } from '../game/world';
import { mountForScene } from '../ui/hud/hudLayer';
import { createLevelSelectView } from '../ui/hud/levelSelectView';
import { PALETTE } from '../ui/palette';
import { attachDebugOverlay } from './debugOverlay';
import { addWorldMap } from './mapView';
import { SCENE_KEYS } from './sceneKeys';

/** Header strip height in game px; the world map is fitted below it. */
const HEADER_PX = 110;

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.LEVEL_SELECT });
  }

  create(): void {
    addWorldMap(this);
    const cam = this.cameras.main;
    cam.setBackgroundColor(PALETTE.ocean);
    // Fit the whole world below the header; side margins are ocean.
    const { width, height } = this.scale;
    const zoom = Math.min(width / WORLD.width, (height - HEADER_PX) / WORLD.height);
    const center = { x: WORLD.width / 2, y: (height / 2 - HEADER_PX) / zoom };
    cam.setZoom(zoom);
    cam.centerOn(center.x, center.y);
    const toScreen = (p: { x: number; y: number }) => ({
      x: (p.x - center.x) * zoom + width / 2,
      y: (p.y - center.y) * zoom + height / 2,
    });
    attachDebugOverlay(this);

    const region = this.add.graphics().setDepth(5);
    const view = createLevelSelectView(
      LEVELS.map((level) => {
        const c = rectCenter(level.viewport);
        return {
          level,
          screen: toScreen(c),
          stars: progress.getStars(level.id),
          unlocked: progress.isUnlocked(level.id),
        };
      }),
      {
        onSelect: (id) => this.scene.start(SCENE_KEYS.PLANNING, { levelId: id, showIntro: true }),
        onHover: (id) => {
          region.clear();
          const level = LEVELS.find((l) => l.id === id);
          if (!level) return;
          const v = level.viewport;
          region.fillStyle(0xffffff, 0.08);
          region.fillRect(v.x, v.y, v.w, v.h);
          region.lineStyle(1.5 / cam.zoom, 0xffffff, 0.6);
          region.strokeRect(v.x, v.y, v.w, v.h);
        },
        onBack: () => {
          window.dispatchEvent(new CustomEvent('show-start-screen'));
          this.scene.start(SCENE_KEYS.BOOT);
        },
      }
    );
    mountForScene(this, view);
  }
}
