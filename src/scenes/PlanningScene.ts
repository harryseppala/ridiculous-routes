import Phaser from 'phaser';
import { dist, distToSegment } from '../game/geometry';
import type { LandField } from '../game/landField';
import { getLevel } from '../game/levels';
import type { LevelDef } from '../game/levels/types';
import { PlanningState } from '../game/planningState';
import { simulateEstimate, validateRoute, type RouteValidation } from '../game/simulate';
import type { Route, Vec, VoyageResult } from '../game/types';
import { attachDebugOverlay } from './debugOverlay';
import { HazardView } from './hazardView';
import { addWorldMap, getLandField, isOverSidebar, setupMapCamera } from './mapView';
import { RouteView } from './routeView';
import { SCENE_KEYS } from './sceneKeys';

export interface PlanningSceneData {
  levelId?: number;
  /** Route to restore (Retry). */
  route?: Route;
}

/** Hit radii in screen pixels. */
const HIT_PX = { waypoint: 11, port: 18, leg: 8, label: 16 } as const;

interface DragState {
  index: number;
  moved: boolean;
  /** Inserted by this click: cancelling undoes the insertion. */
  inserted: boolean;
  pending: Vec | null;
}

export class PlanningScene extends Phaser.Scene {
  protected level!: LevelDef;
  protected land!: LandField;
  protected state!: PlanningState;
  protected validation: RouteValidation = { blockedLegs: [], blockedPoints: [] };
  protected estimate!: VoyageResult;
  private initialRoute?: Route;
  private hazards!: HazardView;
  private routeView!: RouteView;
  private cam!: Phaser.Cameras.Scene2D.Camera;
  private drag: DragState | null = null;
  private hoverPoint: number | null = null;
  private dirty = true;

  constructor() {
    super({ key: SCENE_KEYS.PLANNING });
  }

  init(data: PlanningSceneData): void {
    this.level = getLevel(data.levelId ?? 1);
    this.initialRoute = data.route;
    this.drag = null;
    this.hoverPoint = null;
    this.dirty = true;
  }

  create(): void {
    this.land = getLandField(this);
    addWorldMap(this);
    this.cam = setupMapCamera(this, this.level.viewport);
    this.hazards = new HazardView(this, this.level, this.cam.zoom);
    this.routeView = new RouteView(this, this.cam.zoom);
    this.state = new PlanningState(this.level, this.initialRoute);
    this.state.onChange(() => {
      this.dirty = true;
    });

    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.input.keyboard?.on('keydown-Z', (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) this.state.undo();
    });
    this.input.keyboard?.on('keydown-ESC', () => this.backToLevels());

    attachDebugOverlay(this, this.level);
    this.refresh();
  }

  update(time: number): void {
    this.hazards.update(time);
    if (this.drag?.pending) {
      this.state.moveWaypoint(this.drag.index, this.drag.pending);
      this.drag.pending = null;
    }
    if (this.dirty) this.refresh();
  }

  protected refresh(): void {
    this.dirty = false;
    this.validation = validateRoute(this.level, this.state.route, this.land);
    this.estimate = simulateEstimate(this.level, this.state.route, this.land);
    this.routeView.render({
      route: this.state.route,
      stage: this.state.stage,
      validation: this.validation,
      selectedLeg: this.state.selectedLeg,
      hoverPoint: this.hoverPoint,
    });
  }

  protected backToLevels(): void {
    this.scene.start(SCENE_KEYS.LEVEL_SELECT);
  }

  protected canGo(): boolean {
    return this.state.stage === 'complete' && this.validation.blockedLegs.length === 0 && this.validation.blockedPoints.length === 0;
  }

  // ---- hit testing (world units, radii from screen px) ----

  private r(px: number): number {
    return px / this.cam.zoom;
  }

  private hitWaypoint(w: Vec): number | null {
    let best: number | null = null;
    let bestD = this.r(HIT_PX.waypoint);
    this.state.route.points.forEach((p, i) => {
      if (this.state.isPort(i)) return;
      const d = dist(p, w);
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  private nearPort(w: Vec, port: Vec): boolean {
    return dist(w, port) <= this.r(HIT_PX.port);
  }

  private hitLabel(w: Vec): number | null {
    const centers = this.routeView.labelCenters;
    for (let i = 0; i < centers.length; i++) {
      if (dist(centers[i], w) <= this.r(HIT_PX.label)) return i;
    }
    return null;
  }

  private hitLeg(w: Vec): number | null {
    const pts = this.state.route.points;
    let best: number | null = null;
    let bestD = this.r(HIT_PX.leg);
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToSegment(w, pts[i], pts[i + 1]);
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  // ---- input ----

  private worldPoint(pointer: Phaser.Input.Pointer): Vec {
    const p = this.cam.getWorldPoint(pointer.x, pointer.y);
    return { x: p.x, y: p.y };
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (isOverSidebar(pointer) || !this.input.enabled) return;
    const w = this.worldPoint(pointer);
    const s = this.state;

    if (pointer.rightButtonDown()) {
      const i = this.hitWaypoint(w);
      if (i !== null) s.deleteWaypoint(i);
      return;
    }
    if (!pointer.leftButtonDown()) return;

    if (s.stage === 'pickStart') {
      if (this.nearPort(w, this.level.start)) s.clickStart();
      else this.onMissedClick('start');
      return;
    }

    const wp = this.hitWaypoint(w);
    if (wp !== null) {
      if (s.beginMove(wp)) this.drag = { index: wp, moved: false, inserted: false, pending: null };
      return;
    }

    if (s.stage === 'drawing') {
      if (this.nearPort(w, this.level.end)) s.clickEnd();
      else if (this.nearPort(w, this.level.start)) return;
      else if (!this.land.isLand(w)) s.addWaypoint(w);
      else this.onMissedClick('land');
      return;
    }

    // complete
    const label = this.hitLabel(w);
    if (label !== null) {
      s.selectLeg(label);
      return;
    }
    const leg = this.hitLeg(w);
    if (leg !== null && !this.land.isLand(w)) {
      const idx = s.insertWaypoint(leg, w);
      if (idx !== null) this.drag = { index: idx, moved: false, inserted: true, pending: null };
      return;
    }
    if (leg !== null) {
      s.selectLeg(leg);
      return;
    }
    s.selectLeg(null);
  }

  /** Hook for subclasses / tutorial to react to clicks that did nothing. */
  protected onMissedClick(_kind: 'start' | 'land'): void {}

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const w = this.worldPoint(pointer);
    if (this.drag) {
      this.drag.moved = true;
      this.drag.pending = w;
      return;
    }
    if (isOverSidebar(pointer)) return;
    const hover = this.hitWaypoint(w);
    if (hover !== this.hoverPoint) {
      this.hoverPoint = hover;
      this.dirty = true;
    }
    const overPort =
      (this.state.stage === 'pickStart' && this.nearPort(w, this.level.start)) ||
      (this.state.stage === 'drawing' && this.nearPort(w, this.level.end));
    const overLeg = this.state.stage === 'complete' && (this.hitLabel(w) !== null || this.hitLeg(w) !== null);
    this.input.setDefaultCursor(hover !== null ? 'grab' : overPort || overLeg ? 'pointer' : 'default');
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    if (drag.pending) this.state.moveWaypoint(drag.index, drag.pending);
    const final = this.state.route.points[drag.index];
    const onLand = final ? this.land.isLand(final) : false;
    if (drag.inserted) {
      if (onLand) this.state.undo();
      return;
    }
    if (!drag.moved || onLand) {
      this.state.cancelMove();
      // A click (no drag) on a waypoint selects the leg leading into it.
      if (!drag.moved && pointer.leftButtonReleased()) this.state.selectLeg(drag.index - 1);
    }
  }
}
