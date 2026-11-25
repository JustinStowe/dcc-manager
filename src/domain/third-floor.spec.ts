import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import catalog from './third-floor-catalog.json';
import baseCatalog from './ability-catalog.json';
import { applySelection, CLASSES, eligiblePair, INITIAL_THIRD_FLOOR, offerSelections, RACES, reconcileSelection, restoreThirdFloor, SELECTION_ABILITIES, selectionChoices, selectionPair } from './third-floor';
import { createTutorialProfile } from './tutorial';
import { restoreAbilities, restoreAbility, seedAbilities } from './abilities';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
const bases = { strength: 20, intelligence: 20, constitution: 20, dexterity: 20, charisma: 20 };
const skills = seedAbilities(createTutorialProfile(tutorialDraftFixture()));
const physical = skills.map(row => ({ ...row, rank: row.id === 'heal' ? 1 : 5 }));
const fighterChoices = { weapon: ['bow'], support: ['aiming', 'catcher'] };
function select(key = 'human|fighter', choices: unknown = fighterChoices, learned = skills) {
  return applySelection({ ...INITIAL_THIRD_FLOOR, offers: [key] }, 3, key, choices, bases, learned, 2, { Fire: { resistant: true, vulnerable: false, immune: false } }, 'Confirmed selection');
}
describe('Third Floor rules and catalog', () => {
  it('keeps the private SQL catalog synchronized with reviewed application data', () => {
    const sql = readFileSync('supabase/migrations/202611250018_third_floor_selection.sql', 'utf8');
    const data = sql.match(/\$selection_catalog\$([\s\S]*?)\$selection_catalog\$/)?.[1];
    expect(data).toBeDefined(); expect(JSON.parse(data!)).toEqual({ ...catalog, abilities: [...baseCatalog, ...catalog.abilities] });
    for (const row of SELECTION_ABILITIES) expect(() => restoreAbility({ ...row, rank: 1, marked: false, origin: 'gm' })).not.toThrow();
    for (const option of [...RACES, ...CLASSES]) for (const id of Object.keys(option.skills)) expect(SELECTION_ABILITIES.some(row => row.id === id)).toBe(true);
    for (const profession of CLASSES) for (const group of profession.choices) for (const id of group.ids) expect(SELECTION_ABILITIES.some(row => row.id === id)).toBe(true);
  });
  it('applies the combined Human/Fighter stats and exact selected ranks once', () => {
    const result = select();
    expect(result.bases).toEqual({ strength: 24, intelligence: 22, constitution: 24, dexterity: 22, charisma: 22 });
    expect(result.skills.find(row => row.id === 'bow')?.rank).toBe(5);
    expect(result.skills.find(row => row.id === 'dodge')?.rank).toBe(3);
    expect(result.skills.find(row => row.id === 'aiming')?.rank).toBe(2);
    expect(result.state.selected?.raceName).toBe('Human');
    expect(result.skills.find(row => row.id === 'heal')).toEqual(skills.find(row => row.id === 'heal'));
    expect(skills.some(row => row.id === 'dodge')).toBe(false); expect(bases.strength).toBe(20);
    expect(() => applySelection(result.state, 3, 'human|fighter', fighterChoices, result.bases, result.skills, result.defenseBase, result.baseDefenses, 'Repeat')).toThrow('once');
  });
  it('caps new bonuses at 10 and preserves earned higher ranks and custom IDs/definitions', () => {
    const definition = SELECTION_ABILITIES.find(row => row.id === 'bow')!;
    const bow = restoreAbility({ ...definition, id: 'custom-bow', rank: 8, marked: true, origin: 'gm', description: 'GM reviewed' });
    const low = select('human|fighter', fighterChoices, [...skills, bow]);
    expect(low.skills.find(row => row.id === 'custom-bow')).toMatchObject({ rank: 10, description: 'GM reviewed', marked: true });
    const high = select('human|fighter', fighterChoices, [...skills, { ...bow, rank: 16, maxRank: 20, marked: false }]);
    expect(high.skills.find(row => row.id === 'custom-bow')?.rank).toBe(16);
  });
  it('checks prerequisites before the new Race/Class bonuses', () => {
    expect(() => eligiblePair('amazonian|fighter', skills, bases)).toThrow('Rank 5');
    expect(() => eligiblePair('human|monster-truck-driver', skills, bases)).toThrow('Driving');
    expect(() => eligiblePair('amazonian|fighter', physical, bases)).not.toThrow();
    expect(() => eligiblePair('human|monster-truck-driver', physical, bases)).not.toThrow();
  });
  it('enforces Earth-only Classes using the printed Earth symbols', () => {
    expect(() => selectionPair('pterolykos|pit-fighter')).toThrow('Earth');
    expect(() => selectionPair('pterolykos|monster-truck-driver')).toThrow('Earth');
    expect(() => selectionPair('pterolykos|blizzardmancer')).not.toThrow();
    expect(selectionPair('igneous|monster-truck-driver').race.earth).toBe(true);
  });
  it.each(['human|blizzardmancer','amazonian|fighter','crocodilian|pit-fighter','igneous|blizzardmancer','pterolykos|fighter','human|monster-truck-driver'])('restores valid grants for %s', key => {
    const result = select(key, key.endsWith('|fighter') ? fighterChoices : {}, physical);
    expect(() => restoreAbilities(result.skills)).not.toThrow(); expect(result.state.selected).not.toBeNull();
  });
  it('combines DR and defense flags without clearing existing resistance or vulnerability', () => {
    const result = select('igneous|blizzardmancer', {});
    expect(result.defenseBase).toBe(5);
    expect(result.baseDefenses).toEqual({ Fire: { resistant: true, vulnerable: false, immune: true }, Ice: { resistant: true, vulnerable: true, immune: false } });
    expect(result.skills.find(row => row.id === 'ice-blast')).toMatchObject({ rank: 4, manaCost: 9 });
    expect(result.bases.intelligence).toBe(22); expect(result.bases.charisma).toBe(18);
  });
  it('requires distinct complete choices and rejects extra or forged grants', () => {
    const profession = CLASSES.find(row => row.id === 'fighter')!;
    for (const choices of [{}, { ...fighterChoices, support: ['aiming','aiming'] }, { ...fighterChoices, weapon: ['heal'] }, { ...fighterChoices, free: ['bow'] }]) expect(() => selectionChoices(profession, choices)).toThrow();
    expect(() => selectionChoices(CLASSES.find(row => row.id === 'pit-fighter')!, { weapon: ['bow'] })).toThrow();
  });
  it('allows up to three eligible pairs, revokes with an empty list and gates Floor/review', () => {
    const offers = ['human|fighter','igneous|blizzardmancer'];
    expect(offerSelections(INITIAL_THIRD_FLOOR, 3, offers, skills, bases).offers).toEqual(offers);
    expect(offerSelections(INITIAL_THIRD_FLOOR, 1, [], skills, bases).offers).toEqual([]);
    expect(() => offerSelections(INITIAL_THIRD_FLOOR, 2, offers, skills, bases)).toThrow('Floor');
    expect(() => offerSelections(INITIAL_THIRD_FLOOR, 3, [offers[0], offers[0]], skills, bases)).toThrow();
    expect(() => offerSelections({ ...INITIAL_THIRD_FLOOR, reviewed: false }, 3, offers, skills, bases)).toThrow('review');
    expect(() => applySelection(INITIAL_THIRD_FLOOR, 3, offers[0], fighterChoices, bases, skills, 0, {}, 'Test')).toThrow('offer');
  });
  it('requires explicit reconciliation and never infers or reapplies previous bonuses', () => {
    const legacy = { ...INITIAL_THIRD_FLOOR, reviewed: false };
    expect(() => reconcileSelection(legacy, 3, false, { mode: 'none' })).toThrow('Confirm');
    expect(() => reconcileSelection(legacy, 3, true, { mode: 'none', confirmed: true })).toThrow('Human');
    expect(reconcileSelection(legacy, 1, false, { mode: 'none', confirmed: true })).toEqual(INITIAL_THIRD_FLOOR);
    const existing = reconcileSelection(legacy, 3, true, { mode: 'existing', confirmed: true, raceId: 'human', classId: 'fighter', reason: 'All bonuses already included' });
    expect(existing.selected).toMatchObject({ raceName: 'Human', className: 'Boring Ol’ Fighter', mode: 'reconciled' });
    expect(() => reconcileSelection(existing, 3, true, { mode: 'none', confirmed: true })).toThrow('complete');
  });
  it('records unsupported existing identities and movement without granting catalog benefits', () => {
    const existing = reconcileSelection({ ...INITIAL_THIRD_FLOOR, reviewed: false }, 4, false, { mode: 'existing', confirmed: true, raceId: 'manual', classId: 'manual', raceName: 'Custom Race', className: 'Custom Class', size: 3, move: 30, step: 15, reason: 'Existing manual benefits reviewed' });
    expect(restoreThirdFloor(existing)).toEqual(existing); expect(existing.selected?.move).toBe(30);
  });
  it('rejects underflow/overflow and conflicting learned definitions instead of silently changing them', () => {
    expect(() => eligiblePair('igneous|blizzardmancer', skills, { ...bases, charisma: 1 })).toThrow();
    expect(() => eligiblePair('human|fighter', skills, { ...bases, strength: 9999 })).toThrow();
    const bad = restoreAbility({ ...SELECTION_ABILITIES.find(row => row.id === 'bow')!, name: 'Other ability', rank: 1, marked: false, origin: 'gm' });
    expect(() => select('human|fighter', fighterChoices, [...skills, bad])).toThrow('conflicting');
  });
  it.each([null, {}, { ...INITIAL_THIRD_FLOOR, reviewed: false, offers: ['human|fighter'] }, { ...INITIAL_THIRD_FLOOR, offers: ['pterolykos|pit-fighter'] }])('rejects invalid stored states %j', value => { expect(() => restoreThirdFloor(value)).toThrow(); });
});
