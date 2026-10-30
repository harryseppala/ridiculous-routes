import Phaser from 'phaser';
import { SCENE_KEYS } from './sceneKeys';

export class SailingScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.SAILING });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#072a44');
  }
}
