import Phaser from 'phaser';
import { SCENE_KEYS } from './sceneKeys';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.RESULTS });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#072a44');
  }
}
