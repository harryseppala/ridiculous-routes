import Phaser from 'phaser';

/**
 * Text placed in world space that renders at a fixed screen size regardless of
 * camera zoom (font rendered at `sizePx`, scaled by 1/zoom).
 */
export function worldText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  zoom: number,
  sizePx = 13,
  style: Phaser.Types.GameObjects.Text.TextStyle = {}
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: `${sizePx}px`,
      color: '#ffffff',
      stroke: '#0b1e33',
      strokeThickness: 3,
      resolution: Math.max(1, window.devicePixelRatio || 1),
      ...style,
    })
    .setScale(1 / zoom);
}
