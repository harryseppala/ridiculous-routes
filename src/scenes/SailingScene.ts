import Phaser from 'phaser';
import { lerp } from '../game/geometry';
import { getLevel } from '../game/levels';
import type { LevelDef } from '../game/levels/types';
import { progress } from '../game/progress';
import type { Route, VoyageResult, VoyageTotals } from '../game/types';
import { mountForScene } from '../ui/hud/hudLayer';
import { createSailingHud, type SailingHud } from '../ui/hud/sailingHud';
import { PALETTE } from '../ui/palette';
import { HazardView } from './hazardView';
import { addWorldMap, setupMapCamera } from './mapView';
import { RouteView } from './routeView';
import { SCENE_KEYS } from './sceneKeys';

export interface SailingSceneData {
  levelId: number;
  route: Route;
  result: VoyageResult;
}

export interface VoyageEndData extends SailingSceneData {
  improved: boolean;
}

const SHIP_KEY = 'ship';
const MIN_MS = 6000;
const MAX_MS = 10000;
const MS_PER_SAMPLE = 30;

export class SailingScene extends Phaser.Scene {
  private data_!: SailingSceneData;
  private level!: LevelDef;
  private hazards!: HazardView;
  private ship!: Phaser.GameObjects.Image;
  private hud!: SailingHud;
  private progress = 0;
  private durationMs = MIN_MS;
  private speedMul = 1;
  private finished = false;

  constructor() {
    super({ key: SCENE_KEYS.SAILING });
  }

  init(data: SailingSceneData): void {
    this.data_ = data;
    this.level = getLevel(data.levelId);
    this.progress = 0;
    this.speedMul = 1;
    this.finished = false;
    const n = data.result.samples.length;
    this.durationMs = Phaser.Math.Clamp(n * MS_PER_SAMPLE, MIN_MS, MAX_MS);
    // A failed voyage stops early: play only the sailed part at the same pace.
    if (data.result.failure) this.durationMs = Math.max(2500, n * MS_PER_SAMPLE * 0.8);
  }

  create(): void {
    addWorldMap(this);
    const cam = setupMapCamera(this, this.level.viewport);
    this.hazards = new HazardView(this, this.level, cam.zoom);
    const routeView = new RouteView(this, cam.zoom);
    routeView.render({
      route: this.data_.route,
      stage: 'complete',
      validation: { blockedLegs: [], blockedPoints: [] },
      selectedLeg: null,
      faded: true,
    });

    ensureShipTexture(this);
    const first = this.data_.result.samples[0];
    this.ship = this.add
      .image(first.pos.x, first.pos.y, SHIP_KEY)
      .setScale(1 / cam.zoom)
      .setDepth(30);

    this.hud = createSailingHud(this.level, (on) => {
      this.speedMul = on ? 2 : 1;
    });
    mountForScene(this, this.hud.root);
    this.hud.update({ costK: 0, hours: 0, co2T: 0 });
  }

  update(time: number, delta: number): void {
    this.hazards.update(time);
    if (this.finished) return;
    const samples = this.data_.result.samples;
    this.progress = Math.min(1, this.progress + (delta * this.speedMul) / this.durationMs);
    const f = this.progress * (samples.length - 1);
    const i = Math.min(samples.length - 2, Math.floor(f));
    if (samples.length < 2) {
      this.finish();
      return;
    }
    const a = samples[i];
    const b = samples[i + 1];
    const k = f - i;
    const pos = lerp(a.pos, b.pos, k);
    this.ship.setPosition(pos.x, pos.y);
    if (a.pos.x !== b.pos.x || a.pos.y !== b.pos.y) {
      const target = Math.atan2(b.pos.y - a.pos.y, b.pos.x - a.pos.x);
      this.ship.rotation = Phaser.Math.Angle.RotateTo(this.ship.rotation, target, 0.25);
    }
    const totals: VoyageTotals = {
      costK: a.costK + (b.costK - a.costK) * k,
      hours: a.hours + (b.hours - a.hours) * k,
      co2T: a.co2T + (b.co2T - a.co2T) * k,
    };
    this.hud.update(totals);
    if (this.progress >= 1) this.finish();
  }

  private finish(): void {
    this.finished = true;
    const { result } = this.data_;
    this.hud.update(result.totals);
    const last = result.samples[result.samples.length - 1];
    if (result.failure) {
      this.cameras.main.shake(450, 0.012);
      this.splash(last.pos.x, last.pos.y);
      this.time.delayedCall(1100, () => this.end(SCENE_KEYS.GAME_OVER, false));
    } else {
      const improved = progress.recordResult(this.level.id, result.stars);
      this.time.delayedCall(500, () => this.end(SCENE_KEYS.RESULTS, improved));
    }
  }

  private end(key: string, improved: boolean): void {
    const data: VoyageEndData = { ...this.data_, improved };
    this.scene.launch(key, data);
    this.scene.pause();
  }

  private splash(x: number, y: number): void {
    const zoom = this.cameras.main.zoom;
    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(x, y, 6 / zoom, 0xffffff, 0).setStrokeStyle(2 / zoom, 0xffffff, 0.9).setDepth(31);
      this.tweens.add({
        targets: ring,
        radius: 30 / zoom,
        alpha: 0,
        duration: 900,
        delay: i * 180,
        onComplete: () => ring.destroy(),
      });
    }
    this.tweens.add({ targets: this.ship, alpha: 0.35, angle: this.ship.angle + 25, duration: 600 });
  }
}

function ensureShipTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(SHIP_KEY)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // Hull pointing right (+x), 32×14 px.
  g.fillStyle(0x0b1e33, 1);
  g.fillPoints(
    [
      { x: 0, y: 2 },
      { x: 22, y: 1 },
      { x: 32, y: 7 },
      { x: 22, y: 13 },
      { x: 0, y: 12 },
    ],
    true
  );
  g.fillStyle(PALETTE.ship, 1);
  g.fillPoints(
    [
      { x: 2, y: 3.5 },
      { x: 21, y: 3 },
      { x: 29, y: 7 },
      { x: 21, y: 11 },
      { x: 2, y: 10.5 },
    ],
    true
  );
  g.fillStyle(PALETTE.speed.fast, 1);
  g.fillRect(6, 4.5, 4, 5);
  g.fillRect(11, 4.5, 4, 5);
  g.fillStyle(PALETTE.speed.normal, 1);
  g.fillRect(16, 4.5, 4, 5);
  g.generateTexture(SHIP_KEY, 33, 14);
  g.destroy();
}
