import Phaser from 'phaser';
import { t } from '../i18n';
import { WORLD } from '../game/world';
import { PALETTE } from '../ui/palette';
import { attachDebugOverlay } from './debugOverlay';
import { addWorldMap, fitCameraToRect } from './mapView';
import { SCENE_KEYS } from './sceneKeys';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.LEVEL_SELECT });
  }

  create(): void {
    const { width, height } = this.scale;
    const strings = t().levelSelect;

    const mapObjects: Phaser.GameObjects.GameObject[] = [];
    const map = addWorldMap(this);
    if (map) mapObjects.push(map);

    const cam = this.cameras.main;
    cam.setBackgroundColor(PALETTE.ocean);
    fitCameraToRect(cam, { x: 0, y: 0, w: WORLD.width, h: WORLD.height });
    attachDebugOverlay(this);

    const uiCam = this.cameras.add(0, 0, width, height);
    const ui: Phaser.GameObjects.GameObject[] = [];

    ui.push(this.add.rectangle(width / 2, 72, width, 144, 0x001b2e, 0.72));
    ui.push(
      this.add
        .text(width / 2, 54, strings.heading, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '34px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5)
    );
    ui.push(
      this.add
        .text(width / 2, 98, strings.subtitle, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '18px',
          color: '#cfe4f2',
        })
        .setOrigin(0.5)
    );

    const card = this.add
      .rectangle(width / 2, height - 115, 420, 145, 0x003b5c, 0.92)
      .setStrokeStyle(2, 0xf36c21)
      .setInteractive({ useHandCursor: true });
    ui.push(card);
    ui.push(
      this.add
        .text(width / 2, height - 130, strings.level1Title, {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5)
    );
    card.on('pointerdown', () => this.scene.start(SCENE_KEYS.PLANNING, { levelId: 1 }));

    const backBtn = this.add
      .text(40, 44, `← ${strings.backToTitle}`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setInteractive({ useHandCursor: true });
    ui.push(backBtn);
    backBtn.on('pointerdown', () => {
      window.dispatchEvent(new CustomEvent('show-start-screen'));
      this.scene.start(SCENE_KEYS.BOOT);
    });

    cam.ignore(ui);
    uiCam.ignore(this.children.list.filter((o) => !ui.includes(o)));
  }
}
