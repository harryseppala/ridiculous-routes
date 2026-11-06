import Phaser from 'phaser';
import { LandField, landFromRgba } from '../game/landField';
import { MAP_TEXTURE_SIZE } from '../game/world';
import { isDebugEnabled } from './debugOverlay';
import {
  LAND_DEBUG_KEY,
  LAND_FIELD_REGISTRY_KEY,
  LAND_MASK_KEY,
  MAP_TEXTURE_KEY,
  MAP_SVG_KEY,
} from './mapView';
import { SCENE_KEYS } from './sceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    this.load.image('start-bg', `${import.meta.env.BASE_URL}assets/images/start-bg.png`);
    // The SVG has only a viewBox, so rasterize it at an explicit size (2x its viewBox).
    this.load.svg('tutorial-hand', `${import.meta.env.BASE_URL}assets/images/tutorial-hand.svg`, {
      width: 236,
      height: 264,
    });
    this.load.svg(MAP_TEXTURE_KEY, `${import.meta.env.BASE_URL}assets/images/map3.svg`, {
      width: MAP_TEXTURE_SIZE.width,
      height: MAP_TEXTURE_SIZE.height,
    });
    this.load.text(MAP_SVG_KEY, `${import.meta.env.BASE_URL}assets/images/map3.svg`);
    this.load.image(LAND_MASK_KEY, `${import.meta.env.BASE_URL}assets/images/land-mask.png`);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#001424');
    if (!this.registry.has(LAND_FIELD_REGISTRY_KEY)) this.buildLandField();
  }

  private buildLandField(): void {
    const source = this.textures.get(LAND_MASK_KEY).getSourceImage() as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.drawImage(source, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const land = landFromRgba(img.width, img.height, img.data);
    this.registry.set(LAND_FIELD_REGISTRY_KEY, new LandField(img.width, img.height, land));

    if (isDebugEnabled() && !this.textures.exists(LAND_DEBUG_KEY)) {
      const tint = ctx.createImageData(img.width, img.height);
      for (let i = 0; i < land.length; i++) {
        if (!land[i]) continue;
        tint.data[i * 4] = 255;
        tint.data[i * 4 + 1] = 40;
        tint.data[i * 4 + 2] = 200;
        tint.data[i * 4 + 3] = 110;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(tint, 0, 0);
      this.textures.addCanvas(LAND_DEBUG_KEY, canvas);
    }
  }
}
