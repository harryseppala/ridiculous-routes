import Phaser from 'phaser';
import { dist, lerp, normalize, sub } from '../game/geometry';
import type { PlanningStage } from '../game/planningState';
import type { RouteValidation } from '../game/simulate';
import type { Route, Vec } from '../game/types';
import { t } from '../i18n';
import { PALETTE } from '../ui/palette';
import { worldText } from './worldText';

export interface RouteRenderState {
  route: Route;
  stage: PlanningStage;
  validation: RouteValidation;
  selectedLeg: number | null;
  hoverPoint?: number | null;
  faded?: boolean;
}

const DEPTH = 10;

/** Renders legs (coloured by speed), blocked legs/points, waypoints and speed labels. */
export class RouteView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly px: number;
  /** Label centres in world units (index = leg). */
  labelCenters: Vec[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly zoom: number
  ) {
    this.px = 1 / zoom;
    this.g = scene.add.graphics().setDepth(DEPTH);
  }

  render(s: RouteRenderState): void {
    const { route, validation } = s;
    const px = this.px;
    const g = this.g;
    g.clear();
    const alpha = s.faded ? 0.35 : 1;
    const blocked = new Set(validation.blockedLegs);
    const blockedPts = new Set(validation.blockedPoints);
    this.labelCenters = [];

    for (let i = 0; i < route.points.length - 1; i++) {
      const a = route.points[i];
      const b = route.points[i + 1];
      if (s.selectedLeg === i && !s.faded) {
        g.lineStyle(9 * px, PALETTE.selected, 0.85);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
      g.lineStyle(5 * px, 0x0b1e33, 0.6 * alpha);
      g.lineBetween(a.x, a.y, b.x, b.y);
      if (blocked.has(i)) {
        g.lineStyle(4 * px, PALETTE.blocked, alpha);
        dashed(g, a, b, 7 * px, 5 * px);
      } else {
        g.lineStyle(4 * px, PALETTE.speed[route.speeds[i] ?? 'normal'], alpha);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
      this.labelCenters.push(lerp(a, b, 0.5));
    }

    route.points.forEach((p, i) => {
      const isPort = i === 0 || (s.stage === 'complete' && i === route.points.length - 1);
      if (isPort) return;
      const r = (s.hoverPoint === i ? 7 : 5.5) * px;
      g.fillStyle(blockedPts.has(i) ? PALETTE.blocked : PALETTE.waypoint, alpha);
      g.lineStyle(2 * px, 0x0b1e33, alpha);
      g.fillCircle(p.x, p.y, r);
      g.strokeCircle(p.x, p.y, r);
    });

    this.renderLabels(s);
  }

  private renderLabels(s: RouteRenderState): void {
    const legs = s.faded ? 0 : this.labelCenters.length;
    while (this.labels.length < legs) {
      this.labels.push(
        worldText(this.scene, 0, 0, '', this.zoom, 11, {
          fontStyle: 'bold',
          backgroundColor: '#0b1e33',
          padding: { x: 4, y: 1 },
          strokeThickness: 0,
        })
          .setOrigin(0.5)
          .setDepth(DEPTH + 1)
      );
    }
    this.labels.forEach((label, i) => {
      if (i >= legs) {
        label.setVisible(false);
        return;
      }
      const speed = s.route.speeds[i] ?? 'normal';
      const c = this.labelCenters[i];
      const a = s.route.points[i];
      const b = s.route.points[i + 1];
      // Hide labels on very short legs to avoid clutter.
      const show = dist(a, b) * this.zoom > 46;
      label
        .setVisible(show)
        .setPosition(c.x, c.y)
        .setText(t().speed[speed])
        .setColor(s.selectedLeg === i ? PALETTE.speedCss[speed] : PALETTE.speedLabelCss[speed])
        .setBackgroundColor(s.selectedLeg === i ? '#ffffff' : '#0b1e33');
    });
  }

  setVisible(v: boolean): void {
    this.g.setVisible(v);
    if (!v) this.labels.forEach((l) => l.setVisible(false));
  }

  destroy(): void {
    this.g.destroy();
    this.labels.forEach((l) => l.destroy());
  }
}

function dashed(g: Phaser.GameObjects.Graphics, a: Vec, b: Vec, dash: number, gap: number): void {
  const len = dist(a, b);
  const d = normalize(sub(b, a));
  for (let s = 0; s < len; s += dash + gap) {
    const e = Math.min(len, s + dash);
    g.lineBetween(a.x + d.x * s, a.y + d.y * s, a.x + d.x * e, a.y + d.y * e);
  }
}
