import Phaser from 'phaser';
import { t } from '../i18n';
import { SCENE_KEYS } from './sceneKeys';

export class PlanningScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PLANNING });
  }

  create(): void {
    const { width, height } = this.scale;
    const strings = t();

    const oceanBg = this.add.graphics();
    oceanBg.fillGradientStyle(0x276782, 0x276782, 0x225b74, 0x225b74, 1);
    oceanBg.fillRect(0, 0, width, height);

    if (this.textures.exists('world-map')) {
      this.add.image(width / 2, height / 2, 'world-map').setDisplaySize(width, height);
    }

    this.add
      .rectangle(width / 2, 42, width, 84, 0x001b2e, 0.78)
      .setDepth(2);

    this.add
      .text(width / 2, 28, strings.levelSelect.level1Title, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(
        width / 2,
        58,
        `${strings.meters.budget}  |  ${strings.meters.time}  |  ${strings.meters.emissions}`,
        {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '16px',
          color: '#cfe4f2',
        }
      )
      .setOrigin(0.5)
      .setDepth(3);

    const backBtn = this.add
      .text(32, 34, `← ${strings.levelSelect.heading}`, {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setInteractive({ useHandCursor: true })
      .setDepth(3);

    backBtn.on('pointerdown', () => {
      this.scene.start(SCENE_KEYS.LEVEL_SELECT);
    });
  }
}
