import Phaser from 'phaser';
import { windIntensity } from '../game/environment';
import { dot, normalize, pointInPolygon, polygonBounds, polygonCentroid } from '../game/geometry';
import type { CurrentZone, LevelDef, WindZone } from '../game/levels/types';
import type { Vec } from '../game/types';
import { t } from '../i18n';
import { formatWeatherDuration } from '../i18n/format';
import { PALETTE } from '../ui/palette';
import { worldText } from './worldText';

const DEPTH = { zones: 1, arrows: 2, ports: 20 } as const;

/** Renders wind/storm zones, ECAs, currents and ports for a level. */
export class HazardView {
  private readonly px: number;
  private readonly currentGfx: Phaser.GameObjects.Graphics;
  private readonly stormGfx: Phaser.GameObjects.Graphics;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly weatherGraphics: { zone: WindZone; graphics: Phaser.GameObjects.Graphics[] }[] = [];
  private readonly ports: Phaser.GameObjects.Container[] = [];
  private hoveredPort: number | null = null;
  private departurePending = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly level: LevelDef,
    private readonly zoom: number
  ) {
    this.px = 1 / zoom;
    const zones = this.track(scene.add.graphics().setDepth(DEPTH.zones));
    this.stormGfx = this.track(scene.add.graphics().setDepth(DEPTH.arrows));
    this.currentGfx = this.track(scene.add.graphics().setDepth(DEPTH.zones));

    for (const eca of level.ecas) this.drawEca(zones, eca);
    for (const zone of level.windZones) {
      const wind = this.track(scene.add.graphics().setDepth(DEPTH.zones));
      const arrows = this.track(scene.add.graphics().setDepth(DEPTH.arrows));
      this.weatherGraphics.push({ zone, graphics: [wind, arrows] });
      this.drawWindZone(wind, arrows, zone);
      if (zone.weather) {
        const center = polygonCentroid(zone.polygon);
        const text = zone.weather.toIntensity > zone.weather.fromIntensity ? t().weather.builds : t().weather.fades;
        this.track(worldText(scene, center.x, center.y, `${text} · ${formatWeatherDuration(zone.weather.toHour)}`, zoom, 11, { fontStyle: 'bold' })
          .setOrigin(0.5).setDepth(DEPTH.arrows + 1));
      }
    }
    this.drawPorts();
  }

  private track<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.objects.push(o);
    return o;
  }

  private drawEca(g: Phaser.GameObjects.Graphics, poly: Vec[]): void {
    const px = this.px;
    g.fillStyle(PALETTE.eca, 0.12);
    g.fillPoints(poly, true);
    const b = polygonBounds(poly);
    const spacing = 9 * px;
    g.lineStyle(1.5 * px, PALETTE.eca, 0.75);
    // 45° hatching clipped to the polygon by sampling.
    const span = b.maxX - b.minX + (b.maxY - b.minY);
    const step = 1.5 * px;
    for (let c = -span; c <= span; c += spacing) {
      let segStart: Vec | null = null;
      for (let s = 0; s <= span * 1.5; s += step) {
        const p = { x: b.minX + c + s, y: b.minY + s };
        const inside = pointInPolygon(p, poly);
        if (inside && !segStart) segStart = p;
        if ((!inside || s + step > span * 1.5) && segStart) {
          g.lineBetween(segStart.x, segStart.y, p.x, p.y);
          segStart = null;
        }
      }
    }
    g.lineStyle(2 * px, PALETTE.eca, 0.95);
    g.strokePoints(poly, true);
  }

  private drawWindZone(zones: Phaser.GameObjects.Graphics, arrows: Phaser.GameObjects.Graphics, z: WindZone): void {
    const px = this.px;
    if (z.strength === 'storm') {
      zones.fillStyle(PALETTE.storm, 0.5);
      zones.fillPoints(z.polygon, true);
      zones.lineStyle(2 * px, PALETTE.stormFlash, 0.8);
      zones.strokePoints(z.polygon, true);
    } else if (z.strength === 'strong') {
      zones.fillStyle(PALETTE.windStrong, 0.28);
      zones.fillPoints(z.polygon, true);
      zones.lineStyle(1.5 * px, PALETTE.windStrong, 0.8);
      zones.strokePoints(z.polygon, true);
    } else {
      zones.fillStyle(PALETTE.windLight, 0.06);
      zones.fillPoints(z.polygon, true);
    }

    const b = polygonBounds(z.polygon);
    const spacing = 46 * px;
    const len = (10 + z.knots * 0.6) * px;
    const color = z.strength === 'light' ? PALETTE.windLight : 0xffffff;
    arrows.lineStyle(2 * px, color, z.strength === 'light' ? 0.6 : 0.9);
    arrows.fillStyle(color, z.strength === 'light' ? 0.6 : 0.9);
    for (let y = b.minY + spacing / 2; y < b.maxY; y += spacing) {
      for (let x = b.minX + spacing / 2; x < b.maxX; x += spacing) {
        if (!pointInPolygon({ x, y }, z.polygon)) continue;
        drawArrow(arrows, { x, y }, z.dir, len, px);
      }
    }
  }

  private drawPorts(): void {
    const names = t().levels[this.level.textKey];
    this.drawPort(this.level.start, names.startName);
    this.drawPort(this.level.end, names.endName);
  }

  private drawPort(p: Vec, name: string): void {
    const px = this.px;
    const g = this.scene.add.graphics();
    g.fillStyle(0x06243a, 0.9);
    g.fillCircle(1 * px, 2 * px, 14 * px);
    g.fillStyle(0xffffff);
    g.fillCircle(0, 0, 14 * px);
    g.lineStyle(2 * px, 0x174b70);
    g.strokeCircle(0, 0, 13 * px);
    g.fillStyle(0x2778a3);
    g.fillCircle(0, 0, 10.5 * px);
    g.lineStyle(2 * px, 0xffffff);
    g.strokeCircle(0, -5.2 * px, 2 * px);
    g.lineBetween(0, -3.2 * px, 0, 6 * px);
    g.lineBetween(-4 * px, -1.5 * px, 4 * px, -1.5 * px);
    g.beginPath();
    g.arc(0, 0.5 * px, 6 * px, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
    g.strokePath();
    g.fillStyle(0xffffff);
    g.fillTriangle(-7 * px, 1 * px, -6 * px, 5 * px, -3 * px, 3 * px);
    g.fillTriangle(7 * px, 1 * px, 6 * px, 5 * px, 3 * px, 3 * px);
    const label = worldText(this.scene, 0, 16 * px, name, this.zoom, 13, {
      fontStyle: 'bold', resolution: Math.max(2, (window.devicePixelRatio || 1) * 2),
    }).setOrigin(0.5, 0);
    const port = this.track(this.scene.add.container(p.x, p.y, [g, label]).setDepth(DEPTH.ports));
    this.ports.push(port);
  }

  setPortFeedback(hovered: number | null, departurePending: boolean): void {
    this.hoveredPort = hovered;
    this.departurePending = departurePending;
  }

  /** Animate currents and storm swirls. Call from scene.update. */
  update(time: number, hours = 0): void {
    const px = this.px;
    this.ports.forEach((port, index) => {
      const attention = index === 0 && this.departurePending;
      const target = index === this.hoveredPort ? 1.25 : attention ? 1.12 + 0.1 * Math.sin(time / 160) : 1;
      port.setScale(Phaser.Math.Linear(port.scaleX, target, 0.22));
      port.x = (index === 0 ? this.level.start.x : this.level.end.x) +
        (attention ? Math.sin(time / 55) * 4 * px : 0);
    });
    for (const { zone, graphics } of this.weatherGraphics) {
      for (const graphic of graphics) graphic.setAlpha(windIntensity(zone, hours));
    }
    this.currentGfx.clear();
    for (const c of this.level.currents) drawCurrent(this.currentGfx, c, time, px);

    this.stormGfx.clear();
    this.stormGfx.lineStyle(2 * px, PALETTE.stormFlash, 0.55);
    for (const z of this.level.windZones) {
      if (z.strength !== 'storm' || windIntensity(z, hours) < 0.05) continue;
      const c = polygonCentroid(z.polygon);
      const rot = time / 900;
      for (let arm = 0; arm < 3; arm++) {
        this.stormGfx.beginPath();
        for (let i = 0; i <= 20; i++) {
          const a = rot + (arm * Math.PI * 2) / 3 + i * 0.18;
          const r = (4 + i * 1.3) * px;
          const p = { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
          if (i === 0) this.stormGfx.moveTo(p.x, p.y);
          else this.stormGfx.lineTo(p.x, p.y);
        }
        this.stormGfx.strokePath();
      }
    }
  }

  setAlpha(alpha: number): void {
    for (const o of this.objects) (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha?.(alpha);
  }

  destroy(): void {
    for (const o of this.objects) o.destroy();
  }
}

export function drawArrow(g: Phaser.GameObjects.Graphics, center: Vec, dir: Vec, len: number, px: number): void {
  const d = normalize(dir);
  const tail = { x: center.x - (d.x * len) / 2, y: center.y - (d.y * len) / 2 };
  const head = { x: center.x + (d.x * len) / 2, y: center.y + (d.y * len) / 2 };
  g.lineBetween(tail.x, tail.y, head.x, head.y);
  const s = 4 * px;
  const n = { x: -d.y, y: d.x };
  g.fillTriangle(
    head.x + d.x * s,
    head.y + d.y * s,
    head.x + n.x * s * 0.8,
    head.y + n.y * s * 0.8,
    head.x - n.x * s * 0.8,
    head.y - n.y * s * 0.8
  );
}

function drawCurrent(g: Phaser.GameObjects.Graphics, c: CurrentZone, time: number, px: number): void {
  const d = normalize(c.dir);
  const n = { x: -d.y, y: d.x };
  let minD = Infinity;
  let maxD = -Infinity;
  let minN = Infinity;
  let maxN = -Infinity;
  for (const p of c.polygon) {
    minD = Math.min(minD, dot(p, d));
    maxD = Math.max(maxD, dot(p, d));
    minN = Math.min(minN, dot(p, n));
    maxN = Math.max(maxN, dot(p, n));
  }
  g.fillStyle(PALETTE.current, 0.1);
  g.fillPoints(c.polygon, true);
  const rowGap = 14 * px;
  const dash = 9 * px;
  const period = 18 * px;
  const phase = ((time / 1000) * c.knots * 6 * px) % period;
  g.lineStyle(2 * px, PALETTE.current, 0.85);
  let row = 0;
  for (let o = minN + rowGap / 2; o < maxN; o += rowGap, row++) {
    const stagger = (row % 2) * (period / 2);
    for (let s = minD - period + phase + stagger; s < maxD; s += period) {
      const a = { x: d.x * s + n.x * o, y: d.y * s + n.y * o };
      const b = { x: a.x + d.x * dash, y: a.y + d.y * dash };
      if (pointInPolygon(a, c.polygon) && pointInPolygon(b, c.polygon)) g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }
}
