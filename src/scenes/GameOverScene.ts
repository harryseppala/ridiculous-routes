import Phaser from 'phaser';
import { mountForScene } from '../ui/hud/hudLayer';
import { createGameOverView } from '../ui/hud/gameOverView';
import type { VoyageEndData } from './SailingScene';
import { SCENE_KEYS } from './sceneKeys';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  create(data: VoyageEndData): void {
    const reason = data.result.failure?.reason ?? 'land';
    const view = createGameOverView(reason, {
      onRetry: () => this.goTo(SCENE_KEYS.PLANNING, { levelId: data.levelId, route: data.route }),
      onLevels: () => this.goTo(SCENE_KEYS.LEVEL_SELECT, {}),
    });
    mountForScene(this, view);
  }

  private goTo(key: string, data: object): void {
    this.scene.stop(SCENE_KEYS.SAILING);
    this.scene.start(key, data);
  }
}
