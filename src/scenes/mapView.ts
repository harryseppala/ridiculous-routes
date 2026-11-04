import Phaser from 'phaser';
import { LandField } from '../game/landField';
import { LAYOUT, WORLD, type Rect } from '../game/world';
import { PALETTE } from '../ui/palette';

export const MAP_TEXTURE_KEY = 'world-map';
export const MAP_SVG_KEY = 'world-map-svg';
export const LAND_MASK_KEY = 'land-mask';
export const LAND_DEBUG_KEY = 'land-debug';
export const LAND_FIELD_REGISTRY_KEY = 'landField';

/** Ocean margin around the world rect so zoomed cameras never show the void. */
const OCEAN_MARGIN = 400;

/** Draw the world map in world units (1 unit = 1 Phaser world px). */
export function addWorldMap(scene: Phaser.Scene, detailRect?: Rect): Phaser.GameObjects.Image | undefined {
  scene.add
    .rectangle(-OCEAN_MARGIN, -OCEAN_MARGIN, WORLD.width + OCEAN_MARGIN * 2, WORLD.height + OCEAN_MARGIN * 2, PALETTE.ocean)
    .setOrigin(0)
    .setDepth(-10);
  if (!scene.textures.exists(MAP_TEXTURE_KEY)) return undefined;
  if (detailRect) addDetailedMap(scene, detailRect);
  return scene.add
    .image(0, 0, MAP_TEXTURE_KEY)
    .setOrigin(0)
    .setScale(1 / WORLD.textureScale)
    .setDepth(-9);
}

/** Rasterise only the visible SVG region at screen resolution, rather than enlarging the world texture. */
function addDetailedMap(scene: Phaser.Scene, rect: Rect): void {
  const key = `world-detail-${rect.x}-${rect.y}-${rect.w}-${rect.h}`;
  const show = (): void => {
    scene.add.image(rect.x, rect.y, key).setOrigin(0).setDisplaySize(rect.w, rect.h).setDepth(-8);
  };
  if (scene.textures.exists(key)) {
    show();
    return;
  }
  const svg: string | undefined = scene.cache.text.get(MAP_SVG_KEY);
  if (!svg) {
    console.error('Detailed map unavailable: SVG source was not loaded');
    return;
  }
  const zoom = Math.min(LAYOUT.mapWidth / rect.w, LAYOUT.gameHeight / rect.h);
  const width = Math.ceil(rect.w * zoom * 2);
  const height = Math.ceil(rect.h * zoom * 2);
  const cropped = svg
    .replace('<svg id="Layer_1"', `<svg id="Layer_1" width="${width}" height="${height}"`)
    .replace(/viewBox="[^"]+"/, `viewBox="${rect.x} ${rect.y} ${rect.w} ${rect.h}"`);
  const image = new Image();
  let active = true;
  const shutdown = (): void => { active = false; };
  scene.events.once('shutdown', shutdown);
  image.onload = () => {
    scene.events.off('shutdown', shutdown);
    if (!active) return;
    if (!scene.textures.exists(key)) scene.textures.addImage(key, image);
    show();
  };
  image.onerror = () => {
    scene.events.off('shutdown', shutdown);
    console.error('Could not render detailed map', key);
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cropped)}`;
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
  return pointer.x >= LAYOUT.gameWidth - LAYOUT.sidebarWidth && pointer.y <= 260;
}
