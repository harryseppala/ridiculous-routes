import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import { SCENE_KEYS } from './scenes/sceneKeys';
import { mountStartScreen } from './ui/startScreen';

const game = new Phaser.Game(gameConfig);

const overlayContainer = document.getElementById('ui-overlay');
if (!overlayContainer) {
  throw new Error('Missing #ui-overlay element in index.html');
}

const startScreen = mountStartScreen(overlayContainer, () => {
  game.scene.start(SCENE_KEYS.LEVEL_SELECT);
});

window.addEventListener('show-start-screen', () => {
  startScreen.show();
});
