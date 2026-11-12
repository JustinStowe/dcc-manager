import catalogData from './ability-catalog.json';
import { castTutorialHeal, tutorialSkills, tutorialModifier, STAT_KEYS, type StatKey, type TutorialProfile } from './tutorial';

export type AbilityKind = 'skill' | 'attack' | 'spell' | 'effect';
export type AdvancementPolicy = 'normal' | 'special' | 'none';
export interface AdvancementResult { readonly die: number; readonly modifier: number; readonly fromRank: number; readonly toRank: number; readonly window: 'two-hour' | 'floor-end' }
export interface LearnedAbility {
  readonly id: string; readonly name: string; readonly kind: AbilityKind; readonly rank: number; readonly maxRank: number;
  readonly stat: StatKey | null; readonly passive: boolean; readonly advancement: AdvancementPolicy; readonly marked: boolean;
  readonly manaCost: number | null; readonly description: string; readonly reference: string; readonly damage: string; readonly range: string;
  readonly automation: 'manual' | 'tutorial-heal'; readonly origin: 'creation' | 'gm'; readonly lastAdvancement?: AdvancementResult;
}
export type AbilityDefinition = Omit<LearnedAbility, 'id' | 'marked' | 'origin' | 'lastAdvancement'>;
export const ABILITY_CATALOG = catalogData as readonly (Omit<AbilityDefinition, 'rank'> & { readonly id: string })[];
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RangeError('Invalid ability data.'); return value as Record<string, unknown>; }
function integer(value: unknown, minimum: number, maximum: number): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) throw new RangeError(`Expected a whole number from ${minimum} to ${maximum}.`); return value; }
function text(value: unknown, maximum: number, required = false): string { if (typeof value !== 'string' || Array.from(value).length > maximum || (required && !value.trim())) throw new RangeError('Check the ability name, description, and reference.'); return value.trim(); }
export function restoreAbility(value: unknown): LearnedAbility {
  const row = object(value);
  if (typeof row.passive !== 'boolean' || typeof row.marked !== 'boolean') throw new RangeError('Invalid ability flags.');
  if (!['skill','attack','spell','effect'].includes(row.kind as string) || !['normal','special','none'].includes(row.advancement as string) || !['manual','tutorial-heal'].includes(row.automation as string) || !['creation','gm'].includes(row.origin as string)) throw new RangeError('Choose supported ability settings.');
  if (row.stat !== null && !STAT_KEYS.includes(row.stat as StatKey)) throw new RangeError('Choose a governing stat or None.');
  const rank = integer(row.rank, 1, 20), maxRank = integer(row.maxRank, 1, 20);
  if (rank > maxRank) throw new RangeError('Rank exceeds this ability’s reviewed limit.');
  if (row.passive && row.advancement === 'normal') throw new RangeError('Passive abilities need an explicit special advancement rule or no marks.');
  if (row.passive && row.stat !== null) throw new RangeError('Passive abilities have no ordinary check modifier.');
  if (row.kind !== 'spell' && row.manaCost !== null) throw new RangeError('Only Spells have a Mana cost.');
  const manaCost = row.kind === 'spell' ? integer(row.manaCost, 0, 10000) : null;
  if (row.marked && (row.advancement === 'none' || rank >= Math.min(15, maxRank))) throw new RangeError('This ability cannot hold an ordinary advancement mark.');
  const result: LearnedAbility = {
    id: text(row.id, 80, true), name: text(row.name, 120, true), kind: row.kind as AbilityKind, rank, maxRank, stat: row.stat as StatKey | null,
    passive: row.passive, advancement: row.advancement as AdvancementPolicy, marked: row.marked, manaCost,
    description: text(row.description, 2000), reference: text(row.reference, 200), damage: text(row.damage, 120), range: text(row.range, 80),
    automation: row.automation as LearnedAbility['automation'], origin: row.origin as LearnedAbility['origin'],
  };
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(result.id)) throw new RangeError('Invalid ability identifier.');
  if (result.id === 'heal' || result.automation === 'tutorial-heal' || result.name.toLowerCase() === 'heal') {
    if (result.id !== 'heal' || result.name !== 'Heal' || result.kind !== 'spell' || result.rank !== 1 || result.maxRank !== 1 || !result.passive || result.stat !== null || result.advancement !== 'none' || result.manaCost !== 2 || result.automation !== 'tutorial-heal' || result.marked) throw new RangeError('Tutorial Heal is a protected Rank 1 Spell.');
  }
  if (row.lastAdvancement !== undefined) {
    const last = object(row.lastAdvancement);
    if (!['two-hour','floor-end'].includes(last.window as string)) throw new RangeError('Invalid advancement window.');
    return { ...result, lastAdvancement: { die: integer(last.die, 1, 20), modifier: integer(last.modifier, -100, 100), fromRank: integer(last.fromRank, 1, 14), toRank: integer(last.toRank, 1, 15), window: last.window as AdvancementResult['window'] } };
  }
  return result;
}
export function restoreAbilities(value: unknown): readonly LearnedAbility[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 200) throw new RangeError('A crawler supports 1–200 learned abilities.');
  const rows = value.map(restoreAbility), ids = new Set<string>(), names = new Set<string>();
  for (const row of rows) { const name = row.name.toLowerCase(); if (ids.has(row.id) || names.has(name)) throw new RangeError('This ability is already learned.'); ids.add(row.id); names.add(name); }
  if (!ids.has('heal')) throw new RangeError('The Tutorial Heal ability must remain learned.');
  return rows;
}
export function seedAbilities(profile: TutorialProfile): readonly LearnedAbility[] {
  return restoreAbilities(tutorialSkills(profile).map((starting) => {
    const definition = catalogData.find((entry) => entry.name === starting.name);
    if (!definition) throw new RangeError(`Missing starting definition: ${starting.name}.`);
    return { ...definition, rank: starting.rank, origin: 'creation', marked: false };
  }));
}
export function canMarkAbility(ability: LearnedAbility): boolean { return ability.advancement !== 'none' && ability.rank < Math.min(15, ability.maxRank); }
export function markAbility(ability: LearnedAbility, marked: boolean, specialConfirmed: boolean): LearnedAbility {
  if (marked && !canMarkAbility(ability)) throw new RangeError('This ability does not qualify for an ordinary advancement mark.');
  if (marked && ability.advancement === 'special' && !specialConfirmed) throw new RangeError('Confirm the special marking condition; mark only one hand-to-hand Skill or Damage Effect per attack.');
  return restoreAbility({ ...ability, marked });
}
export function resolveAdvancement(ability: LearnedAbility, window: AdvancementResult['window'], die: number, modifier: number): LearnedAbility {
  if (!ability.marked || !canMarkAbility(ability)) throw new RangeError('A qualifying marked ability is required.');
  if ((ability.rank <= 4 ? 'two-hour' : 'floor-end') !== window) throw new RangeError('Use the advancement window appropriate to the current rank.');
  integer(die, 1, 20); integer(modifier, -100, 100);
  const rank = die + modifier >= ability.rank ? ability.rank + 1 : ability.rank;
  return restoreAbility({ ...ability, rank, marked: false, lastAdvancement: { die, modifier, fromRank: ability.rank, toRank: rank, window } });
}
export function abilityCheckBonus(ability: LearnedAbility, profile: TutorialProfile, floor = 1): number | null {
  return ability.passive || !ability.stat ? null : Math.min(ability.rank, floor >= 6 ? 20 : 15) + tutorialModifier(profile.stats[ability.stat].enhanced);
}
export function castLearnedSpell(ability: LearnedAbility, profile: TutorialProfile, healthSlots: number, prepared: boolean) {
  integer(healthSlots, 0, 10);
  if (ability.kind !== 'spell' || ability.manaCost === null) throw new RangeError('Choose a learned Spell.');
  if (!prepared) throw new RangeError('Prepare this Spell in the Hotlist first.');
  if (healthSlots === 0) throw new RangeError('A Dying crawler cannot cast.');
  if (profile.mana < ability.manaCost) throw new RangeError('Not enough Mana for this Spell.');
  if (ability.automation === 'tutorial-heal') return { ...castTutorialHeal(healthSlots, profile), ability };
  return { slots: healthSlots, profile: { ...profile, mana: profile.mana - ability.manaCost }, ability: { ...ability, marked: ability.marked || (ability.advancement === 'normal' && canMarkAbility(ability)) } };
}
