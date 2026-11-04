// Add the harbour paths in map3.svg to the existing, hand-tuned collision
// baseline. The current map's decorative coastline layers do not reproduce
// that baseline, so they must not be used to rebake the entire mask.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = resolve(root, 'public/assets/images/map3.svg');
const outPath = resolve(root, 'public/assets/images/land-mask.png');
const basePath = resolve(root, 'scripts/land-base.png');

const WORLD_W = 1025.6;
const WORLD_H = 693.4;
const MASK_SCALE = 2;

const svg = readFileSync(svgPath, 'utf8');
const group = svg.match(/<g id="harbour-islands">([\s\S]*?)<\/g>/);
if (!group) throw new Error('Could not find <g id="harbour-islands"> in map3.svg');

const paths = [...group[1].matchAll(/<path\b[^>]*\/>/g)]
  .map((m) => m[0])
  .filter((p) => /class="st1"/.test(p))
  .map((p) => {
    const d = p.match(/\sd="([^"]+)"/);
    return d ? `<path d="${d[1]}"/>` : '';
  })
  .filter(Boolean);
if (paths.length === 0) throw new Error('No harbour paths found in map3.svg');

const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WORLD_W} ${WORLD_H}">
<rect x="0" y="0" width="${WORLD_W}" height="${WORLD_H}" fill="#ffffff"/>
<g fill="#000000" stroke="none">${paths.join('')}</g>
</svg>`;

const resvg = new Resvg(maskSvg, {
  fitTo: { mode: 'width', value: Math.round(WORLD_W * MASK_SCALE) },
  shapeRendering: 1,
  background: '#ffffff',
});
const png = resvg.render().asPng();
const additions = PNG.sync.read(png);
const base = PNG.sync.read(readFileSync(basePath));
if (base.width !== additions.width || base.height !== additions.height) {
  throw new Error('Harbour mask and collision baseline have different dimensions');
}
for (let i = 0; i < base.width * base.height; i++) {
  const offset = i * 4;
  if (additions.data[offset] < 128) {
    base.data[offset] = 0;
    base.data[offset + 1] = 0;
    base.data[offset + 2] = 0;
    base.data[offset + 3] = 255;
  }
}
writeFileSync(outPath, PNG.sync.write(base));
console.log(`Baked ${paths.length} harbour paths onto the collision baseline → ${outPath}`);
