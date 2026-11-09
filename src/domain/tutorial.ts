import catalogData from './tutorial-catalog.json';

export const STAT_KEYS = ['strength', 'intelligence', 'constitution', 'dexterity', 'charisma'] as const;
export const STAGES = ['childhood', 'adolescence', 'career', 'hobby'] as const;
export type StatKey = typeof STAT_KEYS[number];
export type Stage = typeof STAGES[number];
export type Scores = Record<StatKey, number>;
export interface StatPair { readonly base: number; readonly enhanced: number }
export type TutorialStats = Record<StatKey, StatPair>;
export interface BackgroundChoice { readonly category: string; readonly skills: readonly string[] }
export type BackgroundChoices = Record<Stage, BackgroundChoice>;
export interface TutorialNotes { readonly trauma: string; readonly looseEnds: string; readonly regret: string; readonly gear: string }
export interface TutorialProfile {
  readonly version: 1; readonly pronouns: string;
  readonly method: 'array' | 'rolled'; readonly initialStats: Scores;
  readonly stats: TutorialStats; readonly backgrounds: BackgroundChoices;
  readonly combatId: string; readonly notes: TutorialNotes;
  readonly mana: number; readonly favor: number;
}
export interface TutorialDraft {
  readonly pronouns: string; readonly method: 'array' | 'rolled'; readonly scores: Scores;
  readonly backgrounds: BackgroundChoices; readonly combatId: string; readonly notes: TutorialNotes;
}
export interface BackgroundOption {
  readonly id: string; readonly stage: string; readonly name: string; readonly rank: number;
  readonly skills: readonly { name: string; stat: string | null }[];
}
export const TUTORIAL_CATALOG = catalogData as {
  backgrounds: readonly BackgroundOption[];
  combat: readonly { id: string; name: string; kind: string; effect?: string }[];
};

function whole(value: number, minimum: number, maximum = 10000): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new RangeError(`Expected a whole number from ${minimum} to ${maximum}.`);
  return value;
}
function shortText(value: string, maximum: number): string {
  if (typeof value !== 'string' || value.length > maximum) throw new RangeError(`Text must contain at most ${maximum} characters.`);
  return value.trim();
}
export function tutorialModifier(value: number): number {
  whole(value, 1);
  const bounds = [2, 5, 9, 19, 49, 99, 149, 199, 299];
  const index = bounds.findIndex((bound) => value <= bound);
  return index < 0 ? 10 : index + 1;
}
export function tutorialSkills(profile: Pick<TutorialProfile, 'backgrounds' | 'combatId'>) {
  const skills: { name: string; rank: number; stat: string | null }[] = [];
  for (const stage of STAGES) {
    const choice = profile.backgrounds[stage];
    const category = TUTORIAL_CATALOG.backgrounds.find((item) => item.id === choice.category && item.stage === stage);
    if (!category || choice.skills.length !== 2 || new Set(choice.skills).size !== 2) throw new RangeError(`Choose two different ${stage} Skills.`);
    for (const name of choice.skills) {
      const skill = category.skills.find((item) => item.name === name);
      if (!skill) throw new RangeError(`Choose Skills from your ${stage} background.`);
      skills.push({ ...skill, rank: category.rank });
    }
  }
  const combat = TUTORIAL_CATALOG.combat.find((item) => item.id === profile.combatId);
  if (!combat) throw new RangeError('Choose your second combat Skill.');
  skills.push({ name: 'Unarmed Combat', rank: 3, stat: 'Str' }, { name: combat.name, rank: 3, stat: null });
  if (new Set(skills.map((skill) => skill.name)).size !== 10) throw new RangeError('Your ten background/combat Skills must all be different.');
  if (combat.effect) skills.push({ name: combat.effect, rank: 3, stat: null });
  return [...skills, { name: 'Heal', rank: 1, stat: null }];
}
export function createTutorialProfile(input: TutorialDraft): TutorialProfile {
  if (input.method !== 'array' && input.method !== 'rolled') throw new RangeError('Choose a stat method.');
  const scores = Object.fromEntries(STAT_KEYS.map((key) => [key, whole(input.scores[key], 2, 6)])) as Scores;
  if (input.method === 'array' && Object.values(scores).sort().join(',') !== '2,3,4,5,6') throw new RangeError('Assign 2, 3, 4, 5, and 6 exactly once.');
  const combat = TUTORIAL_CATALOG.combat.find((item) => item.id === input.combatId);
  if (combat?.kind === 'spell' && scores.intelligence < 4) throw new RangeError('An attack Spell requires starting Intelligence of at least 4.');
  const profile: TutorialProfile = {
    version: 1, pronouns: shortText(input.pronouns, 80), method: input.method, initialStats: scores,
    stats: Object.fromEntries(STAT_KEYS.map((key) => [key, { base: scores[key], enhanced: scores[key] }])) as TutorialStats,
    backgrounds: Object.fromEntries<BackgroundChoice>(STAGES.map((stage) => [stage, { category: input.backgrounds[stage].category, skills: [...input.backgrounds[stage].skills] }])) as BackgroundChoices,
    combatId: input.combatId,
    notes: { trauma: shortText(input.notes.trauma, 2000), looseEnds: shortText(input.notes.looseEnds, 2000), regret: shortText(input.notes.regret, 2000), gear: shortText(input.notes.gear, 4000) },
    mana: scores.intelligence, favor: 1,
  };
  tutorialSkills(profile);
  return profile;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RangeError('Invalid tutorial profile.');
  return value as Record<string, unknown>;
}
export function restoreTutorialProfile(value: unknown): TutorialProfile {
  const row = object(value);
  const draft = createTutorialProfile({
    pronouns: row.pronouns as string, method: row.method as TutorialDraft['method'],
    scores: object(row.initialStats) as Scores, backgrounds: object(row.backgrounds) as BackgroundChoices,
    combatId: row.combatId as string, notes: object(row.notes) as unknown as TutorialNotes,
  });
  if (row.version !== 1) throw new RangeError('Unsupported tutorial profile.');
  const stats = object(row.stats);
  const validatedStats = Object.fromEntries(STAT_KEYS.map((key) => {
    const pair = object(stats[key]);
    return [key, { base: whole(pair.base as number, 1), enhanced: whole(pair.enhanced as number, 1) }];
  })) as TutorialStats;
  return { ...draft, stats: validatedStats, mana: whole(row.mana as number, 0, validatedStats.intelligence.enhanced), favor: whole(row.favor as number, 0, 2147483647) };
}
export function damageTutorialSlots(current: number, enhancedConstitution: number, netDamage: number): number {
  whole(current, 0, 10); whole(netDamage, 0, Number.MAX_SAFE_INTEGER);
  return Math.max(0, current - Math.floor(netDamage / tutorialModifier(enhancedConstitution)));
}
export function healTutorialSlots(current: number, slots: number): number {
  return Math.min(10, whole(current, 0, 10) + whole(slots, 0, Number.MAX_SAFE_INTEGER));
}
export function castTutorialHeal(current: number, profile: TutorialProfile) {
  if (current === 0) throw new RangeError('A Dying crawler cannot cast Heal. Record healing received from someone else instead.');
  if (profile.mana < 2) throw new RangeError('Heal requires 2 Mana.');
  return { slots: healTutorialSlots(current, 2), profile: { ...profile, mana: profile.mana - 2 } };
}
