import { STAT_KEYS, tutorialModifier, TUTORIAL_CATALOG, type TutorialStats, type TutorialProfile } from './tutorial';
import type { InventoryItem } from './inventory';

export interface GearBonuses { readonly strength: number; readonly intelligence: number; readonly constitution: number; readonly dexterity: number; readonly charisma: number; readonly dr: number; readonly evade: number }
export const ZERO_BONUSES: GearBonuses = { strength: 0, intelligence: 0, constitution: 0, dexterity: 0, charisma: 0, dr: 0, evade: 0 };
export type HotlistEntry = { readonly kind: 'item' | 'skill'; readonly target: string };
export type Hotlist = readonly (HotlistEntry | null)[];
export interface CrawlerLoadout { readonly baseline: TutorialStats; readonly defenseBase: number; readonly hotlist: Hotlist }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RangeError('Invalid loadout data.');
  return value as Record<string, unknown>;
}
export function bounded(value: unknown, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) throw new RangeError(`Expected a whole number from ${minimum} to ${maximum}.`);
  return value;
}
export function restoreBaseline(value: unknown): TutorialStats {
  const row = object(value);
  return Object.fromEntries(STAT_KEYS.map((key) => { const pair = object(row[key]); return [key, { base: bounded(pair.base, 1, 10000), enhanced: bounded(pair.enhanced, 1, 10000) }]; })) as TutorialStats;
}
export function restoreBonuses(value: unknown): GearBonuses {
  if (value === undefined) return { ...ZERO_BONUSES };
  const row = object(value);
  if (Object.keys(row).length !== 7) throw new RangeError('Expected seven equipment bonus fields.');
  return Object.fromEntries(Object.keys(ZERO_BONUSES).map((key) => [key, bounded(row[key], 0, 1000)])) as unknown as GearBonuses;
}
export function loadoutTotals(baseline: TutorialStats, items: readonly InventoryItem[], defenseBase = 0) {
  const reviewed = restoreBaseline(baseline);
  const gear = { ...ZERO_BONUSES };
  for (const item of items) {
    const bonuses = restoreBonuses(item.bonuses);
    if (item.location === 'stored') continue;
    for (const key of Object.keys(gear) as (keyof GearBonuses)[]) gear[key] += bonuses[key];
  }
  const stats = Object.fromEntries(STAT_KEYS.map((key) => [key, { base: reviewed[key].base, enhanced: bounded(reviewed[key].enhanced + gear[key], 1, 10000) }])) as TutorialStats;
  return { stats, gear, dr: bounded(defenseBase, 0, 10000) + gear.dr, evade: tutorialModifier(stats.dexterity.enhanced) + gear.evade };
}
export function hotlistSkills(profile: TutorialProfile) {
  const combat = TUTORIAL_CATALOG.combat.find((option) => option.id === profile.combatId);
  return [{ id: 'heal', name: 'Heal', automated: true }, ...(combat?.kind === 'spell' ? [{ id: combat.id, name: combat.name, automated: false }] : [])];
}
export function restoreHotlist(value: unknown, items: readonly InventoryItem[], profile: TutorialProfile): Hotlist {
  if (!Array.isArray(value) || value.length !== 10) throw new RangeError('The Hotlist has exactly ten slots.');
  const seen = new Set<string>();
  const skills = hotlistSkills(profile);
  return value.map((raw): HotlistEntry | null => {
    if (raw === null) return null;
    const row = object(raw);
    if ((row.kind !== 'item' && row.kind !== 'skill') || typeof row.target !== 'string') throw new RangeError('Invalid Hotlist reference.');
    if (row.kind === 'item' ? !items.some((item) => item.id === row.target) : !skills.some((skill) => skill.id === row.target)) throw new RangeError('Hotlist target is unavailable.');
    const key = `${row.kind}:${row.target}`;
    if (seen.has(key)) throw new RangeError('Each item stack or Spell uses one Hotlist slot.');
    seen.add(key);
    return { kind: row.kind, target: row.target };
  });
}
export function assignHotlist(current: Hotlist, slot: number, entry: HotlistEntry | null): Hotlist {
  bounded(slot, 1, 10);
  if (current.length !== 10) throw new RangeError('The Hotlist has exactly ten slots.');
  return current.map((existing, index) => index === slot - 1 ? entry : entry && existing?.kind === entry.kind && existing.target === entry.target ? null : existing);
}
export function readyHotlistItem(items: readonly InventoryItem[], target: string, location: string): readonly InventoryItem[] {
  const item = items.find((entry) => entry.id === target);
  if (!item || (item.gearSlot === 'holding' ? !['main-hand', 'off-hand'].includes(location) : item.gearSlot !== 'two-hands' || location !== 'two-hands')) throw new RangeError('Choose a holding slot compatible with this weapon or held item.');
  const used = (place: string) => place === 'two-hands' ? ['main-hand', 'off-hand'] : [place];
  const wanted = used(location);
  return items.map((entry) => entry.id === item.id ? { ...entry, location: location as InventoryItem['location'] } : used(entry.location).some((place) => wanted.includes(place)) ? { ...entry, location: 'stored' as const } : entry);
}
export function damageAfterDr(slots: number, constitution: number, raw: number, dr: number): number {
  bounded(slots, 0, 10); bounded(raw, 0, Number.MAX_SAFE_INTEGER); bounded(dr, 0, 1000000);
  return Math.max(0, slots - Math.floor(Math.max(0, raw - dr) / tutorialModifier(constitution)));
}
