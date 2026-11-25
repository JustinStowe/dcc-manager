import { STAT_KEYS, type Scores } from './tutorial';

export const LEVEL_CAP = 250;
export const AWARD_SOURCES = ['two-hour', 'quest', 'boss', 'crawler-kill', 'grinding', 'other'] as const;
export type AwardSource = typeof AWARD_SOURCES[number];
export interface AdvancementState {
  readonly reconciled: boolean;
  readonly spent: number;
  readonly authorized: number;
  readonly humanFavor: boolean;
}
export type AdvancementOperation = 'reconcile' | 'award' | 'authorize' | 'allocate' | 'human-benefit';
export interface AdvancementEvent {
  readonly id: string;
  readonly operation: AdvancementOperation | 'selection-review' | 'selection-offer' | 'selection-apply';
  readonly at: string;
  readonly summary: string;
  readonly reason: string;
}
export const INITIAL_ADVANCEMENT: AdvancementState = { reconciled: true, spent: 0, authorized: 0, humanFavor: false };

export function whole(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`Enter a whole number from ${min} to ${max}.`);
  return value;
}
export function earnedPoints(level: number): number { return (whole(level, 1, LEVEL_CAP) - 1) * 3; }
export function restoreAdvancement(value: unknown, level: number): AdvancementState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RangeError('Advancement data unavailable. Apply migration 015.');
  const row = value as Record<string, unknown>;
  if (typeof row.reconciled !== 'boolean' || typeof row.humanFavor !== 'boolean') throw new RangeError('Invalid advancement flags.');
  // Preserve legacy levels above the cap for explicit GM review.
  whole(level, 1, row.reconciled ? LEVEL_CAP : 1000);
  const spent = whole(row.spent, 0, row.reconciled ? earnedPoints(level) : 0);
  const authorized = whole(row.authorized, 0, row.reconciled ? earnedPoints(level) - spent : 0);
  if (!row.reconciled && row.humanFavor) throw new RangeError('Reconcile this crawler first.');
  return { reconciled: row.reconciled, spent, authorized, humanFavor: row.humanFavor };
}
export function pendingPoints(level: number, state: AdvancementState): number {
  if (!state.reconciled) throw new RangeError('The GM must reconcile existing advancement first.');
  return earnedPoints(level) - state.spent;
}
export function reconcileAdvancement(state: AdvancementState, level: number, spent: number, confirmed: boolean): AdvancementState {
  if (state.reconciled) throw new RangeError('This crawler has already been reconciled.');
  if (!confirmed) throw new RangeError('Confirm the existing stats and points already spent.');
  return { reconciled: true, spent: whole(spent, 0, earnedPoints(level)), authorized: 0, humanFavor: false };
}
export function awardLevels(level: number, state: AdvancementState, amount: number, floor: number) {
  pendingPoints(level, state);
  whole(amount, 1, LEVEL_CAP - level);
  return { level: level + amount, points: amount * 3, favor: state.humanFavor && floor >= 3 ? amount : 0 };
}
export function authorizePoints(level: number, state: AdvancementState, floor: number, amount: number, saferoom: boolean): AdvancementState {
  whole(amount, 0, pendingPoints(level, state));
  if (amount > 0 && (floor < 3 || !saferoom)) throw new RangeError('Confirm a saferoom on Floor 3 or deeper.');
  return { ...state, authorized: amount };
}
export function allocatePoints(level: number, state: AdvancementState, floor: number, value: unknown, bases: Scores) {
  pendingPoints(level, state);
  if (floor < 3 || state.authorized < 1) throw new RangeError('The GM must authorize saferoom spending on Floor 3 or deeper.');
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 5) throw new RangeError('Enter an allocation for all five stats.');
  const row = value as Record<string, unknown>;
  const allocation = Object.fromEntries(STAT_KEYS.map(key => [key, whole(row[key], 0, state.authorized)])) as Scores;
  const points = Object.values(allocation).reduce((a, b) => a + b, 0);
  whole(points, 1, Math.min(state.authorized, pendingPoints(level, state)));
  const nextBases = Object.fromEntries(STAT_KEYS.map(key => [key, whole(bases[key] + allocation[key], 1, 10000)])) as Scores;
  return { allocation, bases: nextBases, points, state: { ...state, spent: state.spent + points, authorized: state.authorized - points } };
}
export function setHumanBenefit(state: AdvancementState, floor: number, enabled: boolean, confirmed: boolean): AdvancementState {
  if (!state.reconciled) throw new RangeError('Reconcile this crawler first.');
  if (!confirmed || (enabled && floor < 3)) throw new RangeError('Confirm the selected Human race on Floor 3 or deeper.');
  return { ...state, humanFavor: enabled };
}
export function advancementReason(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || Array.from(value.trim()).length > 500) throw new RangeError('Enter a reason of 1–500 characters.');
  return value.trim();
}
