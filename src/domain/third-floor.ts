import catalog from './third-floor-catalog.json';
import { ABILITY_CATALOG, restoreAbilities, restoreAbility, type AbilityDefinition, type LearnedAbility } from './abilities';
import { whole } from './advancement';
import { STAT_KEYS, type Scores } from './tutorial';
import { restoreDefenses, type TypedDefenses } from './typed-defenses';

export interface SelectionOption {
  readonly id: string; readonly name: string; readonly page: number;
  readonly stats: Scores; readonly skills: Readonly<Record<string, number>>; readonly dr: number;
  readonly defenses: TypedDefenses; readonly requirement: string; readonly notes: string;
}
export interface RaceOption extends SelectionOption { readonly earth: boolean; readonly size: number }
export interface ClassOption extends SelectionOption {
  readonly earthOnly: boolean;
  readonly choices: readonly { id: string; label: string; count: number; bonus: number; ids: readonly string[] }[];
}
export const RACES = catalog.races as unknown as readonly RaceOption[];
export const CLASSES = catalog.classes as unknown as readonly ClassOption[];
export const SELECTION_ABILITIES = [...ABILITY_CATALOG, ...catalog.abilities] as readonly (Omit<AbilityDefinition, 'rank'> & { id: string })[];
export interface ThirdFloorSelection {
  readonly raceId: string; readonly classId: string; readonly raceName: string; readonly className: string;
  readonly size: number; readonly move: number; readonly step: number; readonly mode: 'applied' | 'reconciled';
  readonly notes: string;
}
export interface ThirdFloorState { readonly reviewed: boolean; readonly offers: readonly string[]; readonly selected: ThirdFloorSelection | null }
export const INITIAL_THIRD_FLOOR: ThirdFloorState = { reviewed: true, offers: [], selected: null };
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RangeError('Invalid Race/Class data.');
  return value as Record<string, unknown>;
}
export function shortText(value: unknown, max = 100): string {
  if (typeof value !== 'string' || !value.trim() || Array.from(value.trim()).length > max) throw new RangeError(`Enter text of 1–${max} characters.`);
  return value.trim();
}
export function selectionPair(key: unknown) {
  if (typeof key !== 'string' || key.split('|').length !== 2) throw new RangeError('Choose an available Race/Class pair.');
  const [raceId, classId] = key.split('|');
  const race = RACES.find(row => row.id === raceId), profession = CLASSES.find(row => row.id === classId);
  if (!race || !profession) throw new RangeError('Choose an available Race/Class pair.');
  if (profession.earthOnly && !race.earth) throw new RangeError('This Earth Class requires an Earth Race.');
  return { race, profession };
}
export function restoreThirdFloor(value: unknown): ThirdFloorState {
  const row = object(value);
  if (typeof row.reviewed !== 'boolean' || !Array.isArray(row.offers) || row.offers.length > 3 || new Set(row.offers).size !== row.offers.length) throw new RangeError('Invalid selection review/offers.');
  const offers = row.offers.map(value => { selectionPair(value); return value as string; });
  let selected: ThirdFloorSelection | null = null;
  if (row.selected !== null) {
    const s = object(row.selected);
    if (!['applied', 'reconciled'].includes(s.mode as string)) throw new RangeError('Invalid selection mode.');
    const raceId = shortText(s.raceId), classId = shortText(s.classId);
    if ((raceId === 'manual' || classId === 'manual') && s.mode !== 'reconciled') throw new RangeError('Manual identity requires GM reconciliation.');
    if (raceId !== 'manual' && !RACES.some(row => row.id === raceId)) throw new RangeError('Invalid saved Race.');
    if (classId !== 'manual' && !CLASSES.some(row => row.id === classId)) throw new RangeError('Invalid saved Class.');
    if (raceId !== 'manual' && classId !== 'manual') selectionPair(`${raceId}|${classId}`);
    selected = { raceId, classId, raceName: shortText(s.raceName), className: shortText(s.className), size: whole(s.size, 1, 8), move: whole(s.move, 0, 10000), step: whole(s.step, 0, 10000), mode: s.mode as ThirdFloorSelection['mode'], notes: shortText(s.notes, 500) };
  }
  if ((!row.reviewed && (selected || offers.length)) || (selected && offers.length)) throw new RangeError('Inconsistent selection state.');
  return { reviewed: row.reviewed, offers, selected };
}
export function eligiblePair(key: string, skills: readonly LearnedAbility[], bases: Scores) {
  const pair = selectionPair(key);
  if (pair.race.requirement === 'physical-skill-5' && !skills.some(row => row.rank >= 5 && (row.stat === 'strength' || row.stat === 'dexterity'))) throw new RangeError('Amazonian requires an existing Strength- or Dexterity-based Skill at Rank 5+.');
  if (pair.profession.requirement === 'driving-5' && !skills.some(row => row.name.toLowerCase() === 'driving' && row.rank >= 5)) throw new RangeError('Monster Truck Driver requires existing Driving Rank 5+.');
  const result = Object.fromEntries(STAT_KEYS.map(key => [key, whole(bases[key] + pair.race.stats[key] + pair.profession.stats[key], 1, 10000)])) as Scores;
  return { ...pair, bases: result };
}
export function offerSelections(state: ThirdFloorState, floor: number, values: unknown, skills: readonly LearnedAbility[], bases: Scores): ThirdFloorState {
  if (!state.reviewed || state.selected) throw new RangeError('Complete the GM benefit review first; a saved selection cannot be repeated.');
  if (!Array.isArray(values) || values.length > 3 || new Set(values).size !== values.length) throw new RangeError('Offer up to three different Race/Class pairs.');
  if (values.length && floor < 3) throw new RangeError('Selection requires Floor 3 or deeper.');
  for (const key of values) eligiblePair(shortText(key), skills, bases);
  return { ...state, offers: values as string[] };
}
export function reviewedSelection(input: Record<string, unknown>): ThirdFloorSelection {
  const raceId = shortText(input.raceId), classId = shortText(input.classId);
  const race = RACES.find(row => row.id === raceId), profession = CLASSES.find(row => row.id === classId);
  if ((!race && raceId !== 'manual') || (!profession && classId !== 'manual')) throw new RangeError('Choose a reviewed Race and Class.');
  if (race && profession) selectionPair(`${raceId}|${classId}`);
  return { raceId, classId, raceName: race?.name ?? shortText(input.raceName), className: profession?.name ?? shortText(input.className), size: race?.size ?? whole(input.size, 1, 8), move: whole(input.move ?? 20, 0, 10000), step: whole(input.step ?? 10, 0, 10000), mode: 'reconciled', notes: shortText(input.reason, 500) };
}
export function reconcileSelection(state: ThirdFloorState, floor: number, humanFavor: boolean, input: Record<string, unknown>): ThirdFloorState {
  if (state.reviewed || state.selected) throw new RangeError('The existing-benefit review is already complete.');
  if (input.confirmed !== true) throw new RangeError('Confirm the existing benefits have been reviewed.');
  if (input.mode === 'none') {
    if (humanFavor) throw new RangeError('Existing Human Favor is enabled. Reconcile its selected Race/Class first.');
    return { ...INITIAL_THIRD_FLOOR };
  }
  if (input.mode !== 'existing' || floor < 3) throw new RangeError('Existing selection requires Floor 3 or deeper.');
  return { reviewed: true, offers: [], selected: reviewedSelection(input) };
}
export function selectionChoices(profession: ClassOption, value: unknown): Record<string, readonly string[]> {
  const row = object(value);
  if (Object.keys(row).length !== profession.choices.length) throw new RangeError('Complete exactly the listed Class benefit choices.');
  return Object.fromEntries(profession.choices.map(group => {
    const ids = row[group.id];
    if (!Array.isArray(ids) || ids.length !== group.count || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !group.ids.includes(id))) throw new RangeError(`Choose ${group.count} different options for ${group.label}.`);
    return [group.id, ids as string[]];
  }));
}
export function mergeSelectionDefenses(base: TypedDefenses, additions: readonly TypedDefenses[]): TypedDefenses {
  const result = structuredClone(base) as Record<string, { resistant: boolean; vulnerable: boolean; immune: boolean }>;
  for (const defense of additions) for (const [key, flags] of Object.entries(defense)) if (flags) {
    const prior = result[key]; result[key] = { resistant: !!prior?.resistant || flags.resistant, vulnerable: !!prior?.vulnerable || flags.vulnerable, immune: !!prior?.immune || flags.immune };
  }
  return restoreDefenses(result);
}
export function applySelection(state: ThirdFloorState, floor: number, key: string, inputChoices: unknown, bases: Scores, learned: readonly LearnedAbility[], defenseBase: number, baseDefenses: TypedDefenses, reason: string) {
  if (!state.reviewed || state.selected || !state.offers.includes(key) || floor < 3) throw new RangeError('The GM must offer this pair on Floor 3 or deeper; selections apply once.');
  const { race, profession, bases: nextBases } = eligiblePair(key, learned, bases);
  const choices = selectionChoices(profession, inputChoices);
  const grants: Record<string, number> = {};
  for (const source of [race.skills, profession.skills]) for (const [id, amount] of Object.entries(source)) grants[id] = (grants[id] ?? 0) + amount;
  for (const group of profession.choices) for (const id of choices[group.id]) grants[id] = (grants[id] ?? 0) + group.bonus;
  const skills = [...learned];
  for (const [id, amount] of Object.entries(grants)) {
    const definition = SELECTION_ABILITIES.find(row => row.id === id);
    if (!definition || id === 'heal') throw new RangeError('Selection ability definition unavailable.');
    const index = skills.findIndex(row => row.id === id || row.name.toLowerCase() === definition.name.toLowerCase());
    if (index >= 0) {
      const old = skills[index];
      if (old.kind !== definition.kind || old.name.toLowerCase() !== definition.name.toLowerCase()) throw new RangeError('Ask the GM to review the conflicting learned ability definition.');
      const rank = Math.max(old.rank, Math.min(10, old.maxRank, old.rank + amount));
      skills[index] = restoreAbility({ ...old, rank, marked: old.marked && rank < Math.min(15, old.maxRank) });
    } else skills.push(restoreAbility({ ...definition, rank: Math.min(10, amount), marked: false, origin: 'gm' }));
  }
  const selected: ThirdFloorSelection = { raceId: race.id, classId: profession.id, raceName: race.name, className: profession.name, size: race.size, move: 20, step: 10, mode: 'applied', notes: shortText(reason, 500) };
  return { bases: nextBases, skills: restoreAbilities(skills), defenseBase: whole(defenseBase + race.dr + profession.dr, 0, 10000), baseDefenses: mergeSelectionDefenses(baseDefenses, [race.defenses, profession.defenses]), state: { reviewed: true, offers: [], selected } satisfies ThirdFloorState, choices };
}
