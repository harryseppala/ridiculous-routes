import Phaser from 'phaser';
import { SCENE_KEYS } from './sceneKeys';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1b0e14');
  }
}
