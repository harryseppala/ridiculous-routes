import type { Vec } from './types';

/** World units are SVG viewBox units of map3.svg. */
export const WORLD = {
  width: 1025.6,
  height: 693.4,
  /** Land mask pixels per world unit. */
  maskScale: 2,
  /** Map texture rasterisation factor (world unit → texture px). */
  textureScale: 3,
} as const;

export const MAP_TEXTURE_SIZE = {
  width: Math.round(WORLD.width * WORLD.textureScale),
  height: Math.round(WORLD.height * WORLD.textureScale),
} as const;

/** Game-space layout: the map camera on the left, HUD sidebar on the right. */
export const LAYOUT = {
  gameWidth: 1280,
  gameHeight: 720,
  sidebarWidth: 300,
  mapWidth: 980,
} as const;

export function worldToMask(p: Vec): Vec {
  return { x: p.x * WORLD.maskScale, y: p.y * WORLD.maskScale };
}

export function maskToWorld(p: Vec): Vec {
  return { x: p.x / WORLD.maskScale, y: p.y / WORLD.maskScale };
}

export function isInsideWorld(p: Vec): boolean {
  return p.x >= 0 && p.y >= 0 && p.x <= WORLD.width && p.y <= WORLD.height;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectCenter(r: Rect): Vec {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
