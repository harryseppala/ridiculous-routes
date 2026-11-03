import Phaser from 'phaser';
import { LEVELS } from '../game/levels';
import { progress } from '../game/progress';
import { MAP_TEXTURE_SIZE, rectCenter, WORLD } from '../game/world';
import { mountForScene } from '../ui/hud/hudLayer';
import { createLevelSelectView } from '../ui/hud/levelSelectView';
import { PALETTE } from '../ui/palette';
import { attachDebugOverlay } from './debugOverlay';
import { addWorldMap, MAP_TEXTURE_KEY } from './mapView';
import { SCENE_KEYS } from './sceneKeys';

/** Header strip height in game px; the world map is fitted below it. */
const HEADER_PX = 110;

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.LEVEL_SELECT });
  }

  create(): void {
    addWorldMap(this);
    this.extendOcean();
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
        onBack: () => {
          window.dispatchEvent(new CustomEvent('show-start-screen'));
          this.scene.start(SCENE_KEYS.BOOT);
        },
      }
    );
    mountForScene(this, view);
  }

  private extendOcean(): void {
    const source = this.textures.get(MAP_TEXTURE_KEY).getSourceImage() as HTMLImageElement;
    for (const side of ['left', 'right'] as const) {
      const key = `ocean-edge-${side}`;
      if (!this.textures.exists(key)) {
        const texture = this.textures.createCanvas(key, 1, MAP_TEXTURE_SIZE.height);
        if (!texture) continue;
        const sourceX = side === 'left' ? 0 : MAP_TEXTURE_SIZE.width - 1;
        texture.context.drawImage(source, sourceX, 0, 1, MAP_TEXTURE_SIZE.height, 0, 0, 1, MAP_TEXTURE_SIZE.height);
        texture.refresh();
      }
      this.add.image(side === 'left' ? -400 : WORLD.width, 0, key)
        .setOrigin(0)
        .setDisplaySize(400, WORLD.height)
        .setDepth(-9.5);
    }
  }
}
