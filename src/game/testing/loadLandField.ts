import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { LandField, landFromRgba } from '../landField';

const MASK_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../public/assets/images/land-mask.png'
);

export function loadLandFieldFromPng(path: string = MASK_PATH): LandField {
  const png = PNG.sync.read(readFileSync(path));
  return new LandField(png.width, png.height, landFromRgba(png.width, png.height, png.data));
}

let cached: LandField | undefined;

/** Shared real land field for tests (distance transform is computed once). */
export function realLandField(): LandField {
  cached ??= loadLandFieldFromPng();
  return cached;
}

/** Synthetic all-water field with optional rectangular land blocks (world units). */
export function syntheticLandField(
  widthUnits: number,
  heightUnits: number,
  blocks: { x: number; y: number; w: number; h: number }[] = [],
  scale = 2
): LandField {
  const w = Math.round(widthUnits * scale);
  const h = Math.round(heightUnits * scale);
  const land = new Uint8Array(w * h);
  for (const b of blocks) {
    for (let y = Math.floor(b.y * scale); y < Math.ceil((b.y + b.h) * scale); y++) {
      for (let x = Math.floor(b.x * scale); x < Math.ceil((b.x + b.w) * scale); x++) {
        if (x >= 0 && y >= 0 && x < w && y < h) land[y * w + x] = 1;
      }
    }
  }
  return new LandField(w, h, land, scale);
}
