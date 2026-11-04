import type { LevelDef } from './levels/types';
import type { Route, Speed, Vec } from './types';

export type PlanningStage = 'pickStart' | 'drawing' | 'complete';

export type PlanningOp =
  | 'clickStart'
  | 'addWaypoint'
  | 'clickEnd'
  | 'insertWaypoint'
  | 'beginMove'
  | 'move'
  | 'arrive'
  | 'cancelMove'
  | 'delete'
  | 'speed'
  | 'allSpeeds'
  | 'select'
  | 'undo'
  | 'reset';

interface Snapshot {
  route: Route;
  stage: PlanningStage;
}

type Listener = (op: PlanningOp, state: PlanningState) => void;

const cloneRoute = (r: Route): Route => ({
  points: r.points.map((p) => ({ x: p.x, y: p.y })),
  speeds: [...r.speeds],
});

export function defaultSpeed(allowed?: readonly Speed[]): Speed {
  if (!allowed || allowed.length === 0 || allowed.includes('normal')) return 'normal';
  return allowed[0];
}

/** Framework-free route editor with snapshot undo. */
export class PlanningState {
  route: Route = { points: [], speeds: [] };
  stage: PlanningStage = 'pickStart';
  selectedLeg: number | null = null;
  readonly undoStack: Snapshot[] = [];
  private readonly listeners = new Set<Listener>();
  private readonly start: Vec;
  private readonly end: Vec;
  private readonly allowedSpeeds?: readonly Speed[];

  constructor(level: Pick<LevelDef, 'start' | 'end' | 'allowedSpeeds'>, initialRoute?: Route) {
    this.start = level.start;
    this.end = level.end;
    this.allowedSpeeds = level.allowedSpeeds;
    if (initialRoute && initialRoute.points.length >= 2) {
      this.route = cloneRoute(initialRoute);
      this.stage = 'complete';
    }
  }

  get defaultSpeed(): Speed {
    return defaultSpeed(this.allowedSpeeds);
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get legCount(): number {
    return Math.max(0, this.route.points.length - 1);
  }

  /** Index is a port (start always; end only once placed). */
  isPort(i: number): boolean {
    return i === 0 || (this.stage === 'complete' && i === this.route.points.length - 1);
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(op: PlanningOp): void {
    if (this.selectedLeg !== null && this.selectedLeg >= this.legCount) {
      this.selectedLeg = this.legCount > 0 ? this.legCount - 1 : null;
    }
    for (const fn of this.listeners) fn(op, this);
  }

  private push(): void {
    this.undoStack.push({ route: cloneRoute(this.route), stage: this.stage });
  }

  clickStart(): boolean {
    if (this.stage !== 'pickStart') return false;
    this.push();
    this.route = { points: [{ ...this.start }], speeds: [] };
    this.stage = 'drawing';
    this.emit('clickStart');
    return true;
  }

  addWaypoint(p: Vec): boolean {
    if (this.stage !== 'drawing') return false;
    this.push();
    this.route.points.push({ ...p });
    this.route.speeds.push(this.defaultSpeed);
    this.emit('addWaypoint');
    return true;
  }

  clickEnd(): boolean {
    if (this.stage !== 'drawing') return false;
    this.push();
    this.route.points.push({ ...this.end });
    this.route.speeds.push(this.defaultSpeed);
    this.stage = 'complete';
    this.selectedLeg = null;
    this.emit('clickEnd');
    return true;
  }

  /** Split leg `legIndex` at `p`; both halves keep the leg's speed. Returns the new point index. */
  insertWaypoint(legIndex: number, p: Vec): number | null {
    if (legIndex < 0 || legIndex >= this.legCount) return null;
    this.push();
    this.route.points.splice(legIndex + 1, 0, { ...p });
    this.route.speeds.splice(legIndex + 1, 0, this.route.speeds[legIndex]);
    this.emit('insertWaypoint');
    return legIndex + 1;
  }

  /** Call once at drag start: pushes the pre-drag snapshot. */
  beginMove(i: number): boolean {
    if (i <= 0 || i >= this.route.points.length || this.isPort(i)) return false;
    this.push();
    this.emit('beginMove');
    return true;
  }

  moveWaypoint(i: number, p: Vec): void {
    if (i <= 0 || i >= this.route.points.length || this.isPort(i)) return;
    this.route.points[i] = { ...p };
    this.emit('move');
  }

  /** Finish an already-snapshotted edit at the given leg, discarding later points. */
  finishAtLeg(legIndex: number): boolean {
    if (legIndex < 0 || legIndex >= this.legCount) return false;
    this.route.points = [...this.route.points.slice(0, legIndex + 1), { ...this.end }];
    this.route.speeds = this.route.speeds.slice(0, legIndex + 1);
    this.stage = 'complete';
    this.selectedLeg = null;
    this.emit('arrive');
    return true;
  }

  /** Restore the pre-drag snapshot (e.g. released on land). */
  cancelMove(): void {
    const snap = this.undoStack.pop();
    if (!snap) return;
    this.restore(snap);
    this.emit('cancelMove');
  }

  deleteWaypoint(i: number): boolean {
    if (i <= 0 || i >= this.route.points.length || this.isPort(i)) return false;
    this.push();
    const last = i === this.route.points.length - 1;
    this.route.points.splice(i, 1);
    // Merge legs (i-1, i) into leg i-1, keeping the first leg's speed.
    if (last) this.route.speeds.pop();
    else this.route.speeds.splice(i, 1);
    this.emit('delete');
    return true;
  }

  selectLeg(i: number | null): void {
    this.selectedLeg = i !== null && i >= 0 && i < this.legCount ? i : null;
    this.emit('select');
  }

  setLegSpeed(i: number, speed: Speed): boolean {
    if (i < 0 || i >= this.legCount || this.route.speeds[i] === speed) return false;
    if (this.allowedSpeeds && !this.allowedSpeeds.includes(speed)) return false;
    this.push();
    this.route.speeds[i] = speed;
    this.emit('speed');
    return true;
  }

  cycleLegSpeed(i: number): boolean {
    const cycle: Speed[] = ['normal', 'fast', 'slow'];
    const allowed = cycle.filter((speed) => !this.allowedSpeeds || this.allowedSpeeds.includes(speed));
    const current = this.route.speeds[i];
    if (!current || allowed.length < 2) return false;
    return this.setLegSpeed(i, allowed[(allowed.indexOf(current) + 1) % allowed.length]);
  }

  setAllSpeeds(speed: Speed): boolean {
    if (this.legCount === 0 || this.route.speeds.every((s) => s === speed)) return false;
    if (this.allowedSpeeds && !this.allowedSpeeds.includes(speed)) return false;
    this.push();
    this.route.speeds = this.route.speeds.map(() => speed);
    this.emit('allSpeeds');
    return true;
  }

  undo(): boolean {
    const snap = this.undoStack.pop();
    if (!snap) return false;
    this.restore(snap);
    this.emit('undo');
    return true;
  }

  reset(): void {
    if (this.stage === 'pickStart') return;
    this.push();
    this.route = { points: [], speeds: [] };
    this.stage = 'pickStart';
    this.selectedLeg = null;
    this.emit('reset');
  }

  private restore(snap: Snapshot): void {
    this.route = cloneRoute(snap.route);
    this.stage = snap.stage;
  }

  /** A copy of the current route (safe to hand to the engine / other scenes). */
  snapshot(): Route {
    return cloneRoute(this.route);
  }
}
