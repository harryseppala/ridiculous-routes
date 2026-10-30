import Phaser from 'phaser';
import { SCENE_KEYS } from './sceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    this.load.image('start-bg', '/assets/images/start-bg.png');
    this.load.svg('world-map', '/assets/images/map3.svg', {
      width: 1280,
      height: 720,
    });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#001424');
  }
}
