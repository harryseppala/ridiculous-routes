import Phaser from 'phaser';
import { t } from '../i18n';
import { SCENE_KEYS } from './sceneKeys';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.LEVEL_SELECT });
  }

  create(): void {
    const { width, height } = this.scale;
    const strings = t().levelSelect;

    const oceanBg = this.add.graphics();
    oceanBg.fillGradientStyle(0x276782, 0x276782, 0x225b74, 0x225b74, 1);
    oceanBg.fillRect(0, 0, width, height);

    if (this.textures.exists('world-map')) {
      this.add.image(width / 2, height / 2, 'world-map').setDisplaySize(width, height);
    }

    this.add
      .rectangle(width / 2, 72, width, 144, 0x001b2e, 0.72)
      .setDepth(2);

    this.add
      .text(width / 2, 54, strings.heading, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(width / 2, 98, strings.subtitle, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '18px',
        color: '#cfe4f2',
      })
      .setOrigin(0.5)
      .setDepth(3);

    const card = this.add
      .rectangle(width / 2, height - 115, 420, 145, 0x003b5c, 0.92)
      .setStrokeStyle(2, 0xf36c21)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    this.add
      .text(width / 2, height - 148, strings.level1Title, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(width / 2, height - 115, strings.level1Subtitle, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
        color: '#cfe4f2',
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(width / 2, height - 78, '☆ ☆ ☆', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '24px',
        color: '#f36c21',
      })
      .setOrigin(0.5)
      .setDepth(3);

    card.on('pointerover', () => card.setFillStyle(0x00527a, 1));
    card.on('pointerout', () => card.setFillStyle(0x003b5c, 0.92));
    card.on('pointerdown', () => {
      this.scene.start(SCENE_KEYS.PLANNING);
    });

    const backBtn = this.add
      .text(40, 44, `← ${strings.backToTitle}`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    backBtn.on('pointerdown', () => {
      window.dispatchEvent(new CustomEvent('show-start-screen'));
      this.scene.start(SCENE_KEYS.BOOT);
    });
  }
}
