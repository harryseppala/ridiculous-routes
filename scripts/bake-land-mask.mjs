// Rasterises only the land fills (#continents path.st1) of map3.svg into a
// binary PNG (black = land, white = water) at WORLD.maskScale px per world unit.
// Re-run whenever the land shapes in map3.svg change.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = resolve(root, 'public/assets/images/map3.svg');
const outPath = resolve(root, 'public/assets/images/land-mask.png');

const WORLD_W = 1025.6;
const WORLD_H = 693.4;
const MASK_SCALE = 2;

const svg = readFileSync(svgPath, 'utf8');
const group = svg.match(/<g id="continents">([\s\S]*?)<\/g>/);
if (!group) throw new Error('Could not find <g id="continents"> in map3.svg');

const paths = [...group[1].matchAll(/<path\b[^>]*\/>/g)]
  .map((m) => m[0])
  .filter((p) => /class="st1"/.test(p))
  .map((p) => {
    const d = p.match(/\sd="([^"]+)"/);
    return d ? `<path d="${d[1]}"/>` : '';
  })
  .filter(Boolean);

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
writeFileSync(outPath, png);
console.log(`Baked ${paths.length} land paths → ${outPath}`);
