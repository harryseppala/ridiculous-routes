import Phaser from 'phaser';
import { firstArrival, waypointInsidePort } from '../game/arrival';
import { dist, distToSegment } from '../game/geometry';
import type { LandField } from '../game/landField';
import { getLevel } from '../game/levels';
import type { LevelDef } from '../game/levels/types';
import { PlanningState, type PlanningOp } from '../game/planningState';
import { progress } from '../game/progress';
import { routeTouchesEca, TutorialController, type TutorialContext } from '../game/tutorial';
import { simulate, simulateEstimate, validateRoute, type RouteValidation } from '../game/simulate';
import type { Route, Vec, VoyageResult } from '../game/types';
import { t } from '../i18n';
import { fill } from '../i18n/format';
import { mountForScene } from '../ui/hud/hudLayer';
import { createIntroCard } from '../ui/hud/introCard';
import { createPlanningHud, type HudHighlight, type PlanningHud } from '../ui/hud/planningHud';
import { createTutorialCard, type TutorialCard } from '../ui/hud/tutorialCard';
import { attachDebugOverlay } from './debugOverlay';
import { HazardView } from './hazardView';
import { addWorldMap, getLandField, isOverSidebar, setupMapCamera } from './mapView';
import { RouteView } from './routeView';
import { SCENE_KEYS } from './sceneKeys';
import { worldText } from './worldText';

export interface PlanningSceneData {
  levelId?: number;
  /** Route to restore (Retry). */
  route?: Route;
  /** Show the level intro card first (entering from level select, not Retry). */
  showIntro?: boolean;
  /** Replay the tutorial even if it was completed before. */
  forceTutorial?: boolean;
}

/** Hit radii in screen pixels. */
const HIT_PX = { waypoint: 11, port: 18, leg: 8, label: 16 } as const;

interface DragState {
  index: number;
  moved: boolean;
  origin: Vec;
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
  protected showIntro = false;
  private hazards!: HazardView;
  private routeView!: RouteView;
  private cam!: Phaser.Cameras.Scene2D.Camera;
  private drag: DragState | null = null;
  private hoverPoint: number | null = null;
  private dirty = true;
  protected hud!: PlanningHud;
  private tutorial?: TutorialController;
  private tutorialCard?: TutorialCard;
  private tutorialStarted = false;
  private pendingOps: PlanningOp[] = [];
  private portPulse?: Phaser.GameObjects.Arc;
  private passingTip!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.PLANNING });
  }

  init(data: PlanningSceneData): void {
    this.level = getLevel(data.levelId ?? 1);
    this.initialRoute = data.route;
    this.showIntro = data.showIntro === true && !data.route;
    const wantsTutorial = !!this.level.tutorial?.length && !data.route && (data.forceTutorial === true || !progress.isTutorialDone());
    this.tutorial = wantsTutorial ? new TutorialController(this.level.tutorial!) : undefined;
    this.tutorialCard = undefined;
    this.tutorialStarted = false;
    this.pendingOps = [];
    this.drag = null;
    this.hoverPoint = null;
    this.dirty = true;
  }

  create(): void {
    this.land = getLandField(this);
    addWorldMap(this, this.level.viewport);
    this.cam = setupMapCamera(this, this.level.viewport);
    this.hazards = new HazardView(this, this.level, this.cam.zoom);
    this.routeView = new RouteView(this, this.cam.zoom);
    this.passingTip = worldText(this, 0, 0, t().hints.passingPort, this.cam.zoom, 11, {
      backgroundColor: '#0b1e33', padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 1).setDepth(40).setVisible(false);
    this.state = new PlanningState(this.level, this.initialRoute);
    this.state.onChange((op) => {
      this.dirty = true;
      this.pendingOps.push(op);
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

    this.hud = createPlanningHud(this.level, {
      onUndo: () => this.state.undo(),
      onGo: () => this.go(),
      onBack: () => this.backToLevels(),
      onHighlightWaypoint: (index) => this.highlightWaypoint(index),
      onShowTutorial:
        this.level.tutorial?.length
          ? () => this.scene.restart({ levelId: this.level.id, forceTutorial: true })
          : undefined,
    });
    mountForScene(this, this.hud.root);

    attachDebugOverlay(this, this.level);
    this.refresh();

    if (this.showIntro) {
      this.input.enabled = false;
      const unmount = mountForScene(
        this,
        createIntroCard(this.level, () => {
          unmount();
          this.input.enabled = true;
          this.onIntroDismissed();
        })
      );
    } else {
      this.onIntroDismissed();
    }
  }

  /** Called once planning becomes interactive. */
  protected onIntroDismissed(): void {
    if (!this.tutorial) return;
    this.input.enabled = false;
    this.hud.root.style.pointerEvents = 'none';
    let active = true;
    let motion: Phaser.Tweens.Tween | undefined;
    const cursor = this.createTutorialGlove(this.level.start);
    const finish = (): void => {
      if (!active) return;
      active = false;
      motion?.stop();
      cursor.destroy();
      this.state.reset();
      this.state.undoStack.length = 0;
      this.pendingOps = [];
      this.tutorial = undefined;
      this.input.enabled = true;
      this.hud.root.style.pointerEvents = '';
      this.tutorialCard?.showReady();
      this.time.delayedCall(4000, () => {
        this.tutorialCard?.destroy();
        this.tutorialCard = undefined;
      });
      progress.setTutorialDone(true);
      this.dirty = true;
    };
    this.tutorialCard = createTutorialCard(finish);
    mountForScene(this, this.tutorialCard.root);
    const midpoint = { x: (this.level.start.x + this.level.end.x) / 2, y: (this.level.start.y + this.level.end.y) / 2 };
    const waypoint = this.level.referenceRoute.points[1] ?? midpoint;
    const secondWaypoint = this.level.referenceRoute.points[2] ?? waypoint;
    const secondMidpoint = { x: (waypoint.x + this.level.end.x) / 2, y: (waypoint.y + this.level.end.y) / 2 };
    const steps: { step: 'straightRoute' | 'waypoints' | 'wind' | 'eca' | 'speed'; point: Vec; action: () => void }[] = [
      { step: 'straightRoute', point: this.level.start, action: () => { this.state.clickStart(); } },
      { step: 'straightRoute', point: this.level.end, action: () => { this.state.clickEnd(); } },
      { step: 'waypoints', point: midpoint, action: () => { this.state.insertWaypoint(0, midpoint); } },
      { step: 'waypoints', point: waypoint, action: () => { this.state.moveWaypoint(1, waypoint); } },
      { step: 'waypoints', point: secondMidpoint, action: () => { this.state.insertWaypoint(1, secondMidpoint); } },
      { step: 'waypoints', point: secondWaypoint, action: () => { this.state.moveWaypoint(2, secondWaypoint); } },
      { step: 'wind', point: this.level.windZones[0]?.polygon[0] ?? waypoint, action: () => {} },
      { step: 'eca', point: this.level.ecas[0]?.[0] ?? waypoint, action: () => {} },
      { step: 'speed', point: waypoint, action: () => { this.state.cycleLegSpeed(0); } },
    ];
    const play = (index: number): void => {
      if (!active) return;
      const step = steps[index];
      if (!step) {
        finish();
        return;
      }
      this.tutorialCard?.showStep(step.step, index + 1, steps.length, false);
      this.tutorialCard?.showSkip();
      motion = this.tweens.add({
        targets: cursor, x: step.point.x, y: step.point.y, duration: 1100, ease: 'Sine.easeInOut',
        onComplete: () => {
          if (!active) return;
          step.action();
          motion = this.tweens.add({
            targets: cursor, alpha: 0.45, duration: 180, yoyo: true, hold: 650,
            onComplete: () => play(index + 1),
          });
        },
      });
    };
    play(0);
  }

  private tutorialContext(): TutorialContext {
    const route = this.state.route;
    const clean =
      this.state.stage === 'complete' && this.validation.blockedLegs.length === 0 && this.validation.blockedPoints.length === 0;
    return {
      route,
      stage: this.state.stage,
      validation: this.validation,
      coastalWindFail: clean && simulate(this.level, route, this.land).failure?.reason === 'coastalWind',
      inEca: routeTouchesEca(this.level, route),
    };
  }

  private updateTutorialUi(): void {
    const tut = this.tutorial;
    const card = this.tutorialCard;
    if (!tut || !card) return;
    if (tut.done) {
      card.showReady();
      this.hud.highlight('go');
      this.portPulse?.setVisible(false);
      if (!progress.isTutorialDone()) progress.setTutorialDone(true);
      return;
    }
    const step = tut.current!;
    card.showStep(step, tut.stepNumber, tut.total, tut.canContinue);
    const highlight: Record<typeof step, HudHighlight | null> = {
      straightRoute: null,
      waypoints: null,
      wind: 'legend-wind',
      eca: 'legend-eca',
      speed: 'speed',
    };
    this.hud.highlight(highlight[step]);
    const port =
      step === 'straightRoute' ? (this.state.stage === 'pickStart' ? this.level.start : this.state.stage === 'drawing' ? this.level.end : null) : null;
    this.portPulse?.setVisible(port !== null);
    if (port) this.portPulse?.setPosition(port.x, port.y);
  }

  private allows(op: PlanningOp): boolean {
    return !this.tutorial || this.tutorial.allows(op);
  }

  protected go(): void {
    if (!this.canGo()) return;
    const route = this.state.snapshot();
    const result = simulate(this.level, route, this.land);
    this.scene.start(SCENE_KEYS.SAILING, { levelId: this.level.id, route, result });
  }

  update(time: number): void {
    const pointer = this.input.activePointer;
    const world = this.worldPoint(pointer);
    const hoveredPort = isOverSidebar(pointer) ? null : this.nearPort(world, this.level.start) ? 0 : this.nearPort(world, this.level.end) ? 1 : null;
    this.hazards.setPortFeedback(hoveredPort, this.state.stage === 'pickStart' && this.input.enabled);
    this.hazards.update(time);
    const points = this.state.route.points;
    const passesStart = points.slice(1, -1).some((p, i) =>
      distToSegment(this.level.start, p, points[i + 2]) <= this.r(HIT_PX.port)
    );
    this.passingTip.setVisible(hoveredPort === 0 && passesStart && !this.drag)
      .setPosition(this.level.start.x, this.level.start.y - this.r(24));
    if (this.drag?.pending) {
      this.state.moveWaypoint(this.drag.index, this.drag.pending);
      this.drag.pending = null;
    }
    if (this.dirty) this.refresh();
  }

  protected refresh(): void {
    this.dirty = false;
    this.validation = validateRoute(this.level, this.state.route, this.land);
    const portBlocked = this.state.route.points.flatMap((p, i) =>
      !this.state.isPort(i) && waypointInsidePort(p, this.level.start, this.r(HIT_PX.port)) ? [i] : []
    );
    this.validation.blockedPoints = [...new Set([...this.validation.blockedPoints, ...portBlocked])];
    this.estimate = simulateEstimate(this.level, this.state.route, this.land);
    // Evaluate the tutorial only on settled routes (not mid-drag).
    if (!this.drag) {
      if (this.tutorial && this.tutorialStarted && this.pendingOps.length > 0) {
        const ctx = this.tutorialContext();
        // At most one step per batch so each card is seen.
        for (const op of this.pendingOps) if (this.tutorial.handle(op, ctx)) break;
        this.updateTutorialUi();
      }
      this.pendingOps = [];
    }
    const route = this.state.route;
    let ghost: { from: Vec; to: Vec } | undefined;
    let arrivalLeg: number | null = this.drag
      ? firstArrival(route, this.level.end, this.r(HIT_PX.port), this.state.stage === 'complete')
      : null;
    if (!this.drag && this.state.stage === 'drawing') {
      const last = route.points[route.points.length - 1];
      const pointer = this.input.activePointer;
      const pointerWorld = this.worldPoint(pointer);
      const defaultGhost = isOverSidebar(pointer) || dist(pointerWorld, last) < this.r(HIT_PX.port);
      const to = defaultGhost ? this.level.end : pointerWorld;
      ghost = { from: last, to };
      if (!defaultGhost) {
        const preview = { points: [...route.points, to], speeds: [...route.speeds, this.state.defaultSpeed] };
        arrivalLeg = firstArrival(preview, this.level.end, this.r(HIT_PX.port), false);
        if (arrivalLeg !== null) ghost = undefined;
      }
    }
    this.routeView.render({
      route: this.state.route,
      stage: this.state.stage,
      validation: this.validation,
      selectedLeg: this.state.selectedLeg,
      hoverPoint: this.hoverPoint,
      ghost,
      arrival: arrivalLeg === null ? undefined : { leg: arrivalLeg, end: this.level.end },
    });
    const invalidWaypoint = this.validation.blockedPoints.find((i) => !this.state.isPort(i)) ?? null;
    const reason = invalidWaypoint !== null
      ? fill(portBlocked.includes(invalidWaypoint) ? t().hints.waypointInHarbour : t().hints.waypointOnLand, { n: invalidWaypoint })
      : this.validation.blockedLegs.length > 0 ? t().hints.blocked
      : this.state.stage === 'pickStart' ? t().hints.pickStart
      : this.state.stage === 'drawing' ? t().hints.drawing
      : null;
    this.hud.update({
      stage: this.state.stage,
      selectedLeg: this.state.selectedLeg,
      speeds: this.state.route.speeds,
      canUndo: this.state.canUndo,
      canGo: this.canGo(),
      blocked: this.validation.blockedLegs.length > 0 || this.validation.blockedPoints.length > 0,
      reason,
      invalidWaypoint,
      totals: this.estimate.totals,
    });
  }

  private highlightWaypoint(index: number): void {
    const point = this.state.route.points[index];
    if (!point) return;
    const ring = this.add.circle(point.x, point.y, this.r(10), 0xff2a2a, 0)
      .setStrokeStyle(this.r(3), 0xff2a2a).setDepth(45);
    this.tweens.add({ targets: ring, scale: 2.5, alpha: 0, duration: 900, onComplete: () => ring.destroy() });
  }

  protected backToLevels(): void {
    this.scene.start(SCENE_KEYS.LEVEL_SELECT);
  }

  protected canGo(): boolean {
    return (
      this.state.stage === 'complete' &&
      !this.drag &&
      this.validation.blockedLegs.length === 0 &&
      this.validation.blockedPoints.length === 0 &&
      (!this.tutorial || this.tutorial.done)
    );
  }

  // ---- hit testing (world units, radii from screen px) ----

  private r(px: number): number {
    return px / this.cam.zoom;
  }

  private createTutorialGlove(position: Vec): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(0xffffff);
    g.lineStyle(2.5, 0x0b1e33);
    g.fillRoundedRect(-4, 1, 9, 25, 4);
    g.strokeRoundedRect(-4, 1, 9, 25, 4);
    g.fillRoundedRect(2, 15, 23, 18, 8);
    g.strokeRoundedRect(2, 15, 23, 18, 8);
    g.fillEllipse(-3, 24, 11, 9);
    g.strokeEllipse(-3, 24, 11, 9);
    g.fillStyle(0x3c7bad);
    g.fillRoundedRect(4, 30, 20, 8, 3);
    g.strokeRoundedRect(4, 30, 20, 8, 3);
    g.lineBetween(9, 18, 9, 23);
    g.lineBetween(15, 18, 15, 23);
    g.lineBetween(21, 19, 21, 23);
    return this.add.container(position.x, position.y, [g]).setScale(1 / this.cam.zoom).setDepth(50);
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
      if (s.beginMove(wp)) this.drag = { index: wp, moved: false, origin: w, inserted: false, pending: null };
      return;
    }

    if (s.stage === 'drawing') {
      if (this.nearPort(w, this.level.end)) s.clickEnd();
      else if (this.nearPort(w, this.level.start)) return;
      else if (!this.land.isLand(w)) {
        if (this.allows('addWaypoint') && s.addWaypoint(w)) {
          const arrival = firstArrival(s.route, this.level.end, this.r(HIT_PX.port), false);
          if (arrival !== null) s.finishAtLeg(arrival);
        }
      }
      else this.onMissedClick('land');
      return;
    }

    // complete
    const label = this.hitLabel(w);
    if (label !== null) {
      s.selectLeg(label);
      s.cycleLegSpeed(label);
      return;
    }
    const leg = this.hitLeg(w);
    if (leg !== null && !this.land.isLand(w) && this.allows('insertWaypoint')) {
      const idx = s.insertWaypoint(leg, w);
      if (idx !== null) this.drag = { index: idx, moved: false, origin: w, inserted: true, pending: null };
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
      if (this.drag.moved || dist(w, this.drag.origin) > this.r(3)) {
        this.drag.moved = true;
        this.drag.pending = w;
      }
      return;
    }
    if (isOverSidebar(pointer)) return;
    if (this.state.stage === 'drawing') this.dirty = true;
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
    this.dirty = true;
    if (drag.pending) this.state.moveWaypoint(drag.index, drag.pending);
    const final = this.state.route.points[drag.index];
    const onLand = final ? this.land.isLand(final) : false;
    const inDeparture = final ? waypointInsidePort(final, this.level.start, this.r(HIT_PX.port)) : false;
    if (drag.inserted) {
      if (onLand || inDeparture) this.state.undo();
      else {
        const arrival = firstArrival(this.state.route, this.level.end, this.r(HIT_PX.port), this.state.stage === 'complete');
        if (arrival !== null) this.state.finishAtLeg(arrival);
      }
      return;
    }
    if (!drag.moved || onLand || inDeparture) {
      this.state.cancelMove();
      if (!drag.moved && pointer.leftButtonReleased()) {
        this.state.selectLeg(drag.index - 1);
        this.state.cycleLegSpeed(drag.index - 1);
      }
    } else {
      const arrival = firstArrival(this.state.route, this.level.end, this.r(HIT_PX.port), this.state.stage === 'complete');
      if (arrival !== null) this.state.finishAtLeg(arrival);
    }
  }
}
