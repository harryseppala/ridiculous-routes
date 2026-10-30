import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { LevelSelectScene } from '../scenes/LevelSelectScene';
import { PlanningScene } from '../scenes/PlanningScene';
import { ResultsScene } from '../scenes/ResultsScene';
import { SailingScene } from '../scenes/SailingScene';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#001424',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    LevelSelectScene,
    PlanningScene,
    SailingScene,
    ResultsScene,
    GameOverScene,
  ],
};
