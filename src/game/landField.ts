import { sampleSegment } from './geometry';
import type { Vec } from './types';
import { WORLD } from './world';

const SEGMENT_STEP_UNITS = 0.5;

/**
 * Binary land raster (mask pixels) with a precomputed distance-to-land field.
 * All public queries take and return world units.
 */
export class LandField {
  readonly width: number;
  readonly height: number;
  private readonly land: Uint8Array;
  /** Distance to nearest land pixel, in mask pixels. */
  private readonly dist: Float32Array;
  private readonly scale: number;

  constructor(width: number, height: number, isLand: Uint8Array, scale: number = WORLD.maskScale) {
    if (isLand.length !== width * height) throw new Error('LandField: size mismatch');
    this.width = width;
    this.height = height;
    this.land = isLand;
    this.scale = scale;
    this.dist = chamferDistance(width, height, isLand);
  }

  private index(p: Vec): number {
    const x = Math.floor(p.x * this.scale);
    const y = Math.floor(p.y * this.scale);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
    return y * this.width + x;
  }

  isLand(p: Vec): boolean {
    const i = this.index(p);
    return i < 0 || this.land[i] === 1;
  }

  /** World units to the nearest land (0 on land / out of bounds). */
  distToLand(p: Vec): number {
    const i = this.index(p);
    if (i < 0) return 0;
    return this.dist[i] / this.scale;
  }

  segmentHitsLand(a: Vec, b: Vec): boolean {
    if (this.isLand(a)) return true;
    for (const p of sampleSegment(a, b, SEGMENT_STEP_UNITS)) {
      if (this.isLand(p)) return true;
    }
    return false;
  }
}

/** Two-pass 3-4 chamfer distance transform; result in pixels (approx. Euclidean). */
function chamferDistance(w: number, h: number, land: Uint8Array): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = land[i] ? 0 : INF;
  const a = 3;
  const b = 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = d[i];
      if (v === 0) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + a);
      if (y > 0) {
        v = Math.min(v, d[i - w] + a);
        if (x > 0) v = Math.min(v, d[i - w - 1] + b);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + b);
      }
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = d[i];
      if (v === 0) continue;
      if (x < w - 1) v = Math.min(v, d[i + 1] + a);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + a);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + b);
        if (x > 0) v = Math.min(v, d[i + w - 1] + b);
      }
      d[i] = v;
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = d[i] / a;
  return d;
}

/** Dark pixel (luma < 128, opaque) = land. Works with RGBA byte arrays. */
export function landFromRgba(width: number, height: number, rgba: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let i = 0; i < out.length; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const bl = rgba[i * 4 + 2];
    const al = rgba[i * 4 + 3];
    out[i] = al > 127 && r * 0.299 + g * 0.587 + bl * 0.114 < 128 ? 1 : 0;
  }
  return out;
}

export function landFieldFromImageData(img: ImageData): LandField {
  return new LandField(img.width, img.height, landFromRgba(img.width, img.height, img.data));
}
