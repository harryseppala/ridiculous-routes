import { environmentAt } from './environment';
import { sampleSegment } from './geometry';
import type { LevelDef, TutorialStepId } from './levels/types';
import type { PlanningOp, PlanningStage } from './planningState';
import type { RouteValidation } from './simulate';
import type { Route } from './types';

export interface TutorialContext {
  route: Route;
  stage: PlanningStage;
  validation: RouteValidation;
  /** Complete route would be wrecked by strong wind near land. */
  coastalWindFail: boolean;
  /** Route passes through an emission control area. */
  inEca: boolean;
}

const ROUTE_EDITS: ReadonlySet<PlanningOp> = new Set([
  'clickStart',
  'addWaypoint',
  'clickEnd',
  'insertWaypoint',
  'move',
  'arrive',
  'cancelMove',
  'delete',
  'undo',
  'reset',
]);

const isClean = (c: TutorialContext): boolean =>
  c.stage === 'complete' && c.validation.blockedLegs.length === 0 && c.validation.blockedPoints.length === 0;

/** Gated tutorial: each step completes only when the player performs its action. */
export class TutorialController {
  private index = 0;
  private ecaBaseline: boolean | null = null;
  /** The current step's goal already holds; the player may just continue. */
  canContinue = false;

  constructor(private readonly steps: readonly TutorialStepId[]) {}

  get current(): TutorialStepId | null {
    return this.steps[this.index] ?? null;
  }

  get stepNumber(): number {
    return this.index + 1;
  }

  get total(): number {
    return this.steps.length;
  }

  get done(): boolean {
    return this.index >= this.steps.length;
  }

  /** Whether a planning operation is permitted right now. */
  allows(op: PlanningOp): boolean {
    if (this.current === 'straightRoute') return op !== 'addWaypoint' && op !== 'insertWaypoint';
    return true;
  }

  /** Call once when the tutorial becomes visible. */
  start(ctx: TutorialContext): void {
    this.activate(ctx);
  }

  /** Feed every planning operation (after validation is up to date). Returns true when the step advanced. */
  handle(op: PlanningOp, ctx: TutorialContext): boolean {
    const step = this.current;
    if (!step) return false;
    if (this.isComplete(step, op, ctx)) {
      this.advance(ctx);
      return true;
    }
    if (step === 'waypoints' || step === 'wind') this.canContinue = this.goalHolds(step, ctx);
    return false;
  }

  /** Skip a step whose goal already holds (`canContinue`). */
  continue(ctx: TutorialContext): boolean {
    if (!this.canContinue || this.done) return false;
    this.advance(ctx);
    return true;
  }

  private advance(ctx: TutorialContext): void {
    this.index++;
    this.activate(ctx);
  }

  private activate(ctx: TutorialContext): void {
    const step = this.current;
    this.ecaBaseline = step === 'eca' ? ctx.inEca : null;
    this.canContinue = step === 'waypoints' || step === 'wind' ? this.goalHolds(step, ctx) : false;
  }

  private goalHolds(step: 'waypoints' | 'wind', ctx: TutorialContext): boolean {
    if (step === 'waypoints') return isClean(ctx) && ctx.route.points.length > 2;
    return isClean(ctx) && !ctx.coastalWindFail;
  }

  private isComplete(step: TutorialStepId, op: PlanningOp, ctx: TutorialContext): boolean {
    switch (step) {
      case 'straightRoute':
        return op === 'clickEnd' && ctx.route.points.length === 2;
      case 'waypoints':
      case 'wind': {
        // Only a transition counts; a goal already met on arrival offers Continue instead.
        const holds = ROUTE_EDITS.has(op) && this.goalHolds(step, ctx);
        const was = this.canContinue;
        return holds && !was;
      }
      case 'eca':
        return ROUTE_EDITS.has(op) && ctx.stage === 'complete' && ctx.inEca !== this.ecaBaseline;
      case 'speed':
        return op === 'speed' || op === 'allSpeeds';
    }
  }
}

export function routeTouchesEca(level: Pick<LevelDef, 'ecas' | 'windZones' | 'currents'>, route: Route): boolean {
  if (level.ecas.length === 0) return false;
  for (let i = 0; i < route.points.length - 1; i++) {
    for (const p of sampleSegment(route.points[i], route.points[i + 1], 1)) {
      if (environmentAt(level, p).inEca) return true;
    }
  }
  return false;
}
