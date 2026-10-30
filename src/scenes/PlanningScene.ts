import Phaser from 'phaser';
import { getLevel } from '../game/levels';
import type { LevelDef } from '../game/levels/types';
import { attachDebugOverlay } from './debugOverlay';
import { addWorldMap, setupMapCamera } from './mapView';
import { SCENE_KEYS } from './sceneKeys';

export interface PlanningSceneData {
  levelId?: number;
}

export class PlanningScene extends Phaser.Scene {
  private level!: LevelDef;

  constructor() {
    super({ key: SCENE_KEYS.PLANNING });
  }

  init(data: PlanningSceneData): void {
    this.level = getLevel(data.levelId ?? 1);
  }

  create(): void {
    addWorldMap(this);
    setupMapCamera(this, this.level.viewport);
    attachDebugOverlay(this, this.level);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(SCENE_KEYS.LEVEL_SELECT));
  }
}
