import Phaser from 'phaser';
import { LandField } from '../game/landField';
import { LAYOUT, WORLD, type Rect } from '../game/world';
import { PALETTE } from '../ui/palette';

export const MAP_TEXTURE_KEY = 'world-map';
export const LAND_MASK_KEY = 'land-mask';
export const LAND_DEBUG_KEY = 'land-debug';
export const LAND_FIELD_REGISTRY_KEY = 'landField';

/** Ocean margin around the world rect so zoomed cameras never show the void. */
const OCEAN_MARGIN = 400;

/** Draw the world map in world units (1 unit = 1 Phaser world px). */
export function addWorldMap(scene: Phaser.Scene): Phaser.GameObjects.Image | undefined {
  scene.add
    .rectangle(-OCEAN_MARGIN, -OCEAN_MARGIN, WORLD.width + OCEAN_MARGIN * 2, WORLD.height + OCEAN_MARGIN * 2, PALETTE.ocean)
    .setOrigin(0)
    .setDepth(-10);
  if (!scene.textures.exists(MAP_TEXTURE_KEY)) return undefined;
  return scene.add
    .image(0, 0, MAP_TEXTURE_KEY)
    .setOrigin(0)
    .setScale(1 / WORLD.textureScale)
    .setDepth(-9);
}

export function getLandField(scene: Phaser.Scene): LandField {
  const field = scene.registry.get(LAND_FIELD_REGISTRY_KEY) as LandField | undefined;
  if (!field) throw new Error('Land field not loaded (BootScene must run first)');
  return field;
}

/** Fit the camera so `rect` is fully visible and centred. */
export function fitCameraToRect(camera: Phaser.Cameras.Scene2D.Camera, rect: Rect): void {
  const zoom = Math.min(camera.width / rect.w, camera.height / rect.h);
  camera.setZoom(zoom);
  camera.centerOn(rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** Camera covering the map area left of the HUD sidebar. */
export function setupMapCamera(scene: Phaser.Scene, rect: Rect): Phaser.Cameras.Scene2D.Camera {
  const cam = scene.cameras.main;
  cam.setViewport(0, 0, LAYOUT.mapWidth, LAYOUT.gameHeight);
  cam.setBackgroundColor(PALETTE.ocean);
  fitCameraToRect(cam, rect);
  return cam;
}

/** True when a pointer (game coords) is over the HUD sidebar and must be ignored by the map. */
export function isOverSidebar(pointer: Phaser.Input.Pointer): boolean {
  return pointer.x >= LAYOUT.mapWidth;
}
