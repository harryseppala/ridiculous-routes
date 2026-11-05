import type { LevelDef } from './levels/types';
import { PlanningState } from './planningState';

export const MAX_ROUTES = 5;

/** Each route keeps the editor's existing, independent undo history. */
export class RoutePlans {
  private readonly plans: PlanningState[];
  selectedIndex = 0;

  constructor(private readonly level: Pick<LevelDef, 'start' | 'end' | 'allowedSpeeds'>) {
    this.plans = [new PlanningState(level)];
  }

  get count(): number {
    return this.plans.length;
  }

  get selected(): PlanningState {
    return this.plans[this.selectedIndex];
  }

  get canAdd(): boolean {
    return this.count < MAX_ROUTES;
  }

  add(): boolean {
    if (!this.canAdd) return false;
    this.plans.push(new PlanningState(this.level));
    this.selectedIndex = this.count - 1;
    return true;
  }

  select(index: number): boolean {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) return false;
    this.selectedIndex = index;
    return true;
  }

  delete(index: number): boolean {
    if (this.count === 1 || !Number.isInteger(index) || index < 0 || index >= this.count) return false;
    this.plans.splice(index, 1);
    if (index <= this.selectedIndex) this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    return true;
  }
}
