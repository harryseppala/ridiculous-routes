import Phaser from 'phaser';
import { getLevel, hasLevel } from '../game/levels';
import { progress } from '../game/progress';
import { mountForScene } from '../ui/hud/hudLayer';
import { createResultsView } from '../ui/hud/resultsView';
import type { VoyageEndData } from './SailingScene';
import { SCENE_KEYS } from './sceneKeys';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.RESULTS });
  }

  create(data: VoyageEndData): void {
    const level = getLevel(data.levelId);
    const nextId = level.id + 1;
    const canNext = hasLevel(nextId) && progress.isUnlocked(nextId);
    const view = createResultsView(level, data.result, data.improved, {
      onRetry: () => this.goTo(SCENE_KEYS.PLANNING, { levelId: level.id, route: data.route }),
      onLevels: () => this.goTo(SCENE_KEYS.LEVEL_SELECT, {}),
      onNext: canNext ? () => this.goTo(SCENE_KEYS.PLANNING, { levelId: nextId, showIntro: true }) : undefined,
    });
    mountForScene(this, view);
  }

  private goTo(key: string, data: object): void {
    this.scene.stop(SCENE_KEYS.SAILING);
    this.scene.start(key, data);
  }
}
