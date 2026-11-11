import { describe, expect, it } from 'vitest';
import { assignHotlist, damageAfterDr, loadoutTotals, readyHotlistItem, restoreBonuses, restoreHotlist, ZERO_BONUSES, type Hotlist } from './loadout';
import { createTutorialProfile } from './tutorial';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
import { validateInventory, type InventoryItem } from './inventory';

const ID = '66666666-6666-4666-8666-666666666666', OTHER = '99999999-9999-4999-8999-999999999999';
function profile() { return createTutorialProfile(tutorialDraftFixture()); }
function item(changes: Partial<InventoryItem> = {}): InventoryItem {
  return { id: ID, name: 'Magic gear', kind: 'gear', quantity: 1, gearSlot: 'holding', location: 'stored', notes: '', ...changes };
}
function empty(): Hotlist { return Array.from({ length: 10 }, () => null); }
describe('Equipment calculations', () => {
  it('preserves a baseline without gear and does not mutate it', () => {
    const base = profile().stats; const totals = loadoutTotals(base, [], 2);
    expect(totals.stats).toEqual(base); expect(totals.dr).toBe(2); expect(totals.evade).toBe(2);
    expect(base.intelligence.enhanced).toBe(6);
  });
  it('adds equipped bonuses once per entry, regardless of quantity', () => {
    const gear = item({ location: 'main-hand', quantity: 100, bonuses: { ...ZERO_BONUSES, intelligence: 3, constitution: 2, dr: 4, evade: 1 } });
    const totals = loadoutTotals(profile().stats, [gear], 2);
    expect(totals.stats.intelligence.enhanced).toBe(9); expect(totals.stats.constitution.enhanced).toBe(5);
    expect(totals.stats.constitution.base).toBe(3); expect(totals.dr).toBe(6); expect(totals.evade).toBe(3);
  });
  it('does not activate bonuses from stored or merely prepared gear', () => {
    const gear = item({ bonuses: { ...ZERO_BONUSES, intelligence: 3, dr: 4 } });
    const totals = loadoutTotals(profile().stats, [gear]); expect(totals.stats.intelligence.enhanced).toBe(6); expect(totals.dr).toBe(0);
  });
  it('removing gear restores the reviewed baseline without absorbing its bonus', () => {
    const gear = item({ location: 'main-hand', bonuses: { ...ZERO_BONUSES, strength: 4 } });
    expect(loadoutTotals(profile().stats, [gear]).stats.strength.enhanced).toBe(6);
    expect(loadoutTotals(profile().stats, [{ ...gear, location: 'stored' }]).stats.strength.enhanced).toBe(2);
  });
  it('uses a baseline separate from previously calculated effective totals', () => {
    const baseline = profile().stats, gear = item({ location: 'main-hand', bonuses: { ...ZERO_BONUSES, strength: 4 } });
    const first = loadoutTotals(baseline, [gear]); const again = loadoutTotals(baseline, [gear]);
    expect(first.stats).toEqual(again.stats); expect(again.stats.strength.enhanced).toBe(6);
  });
  it('derives the DEX modifier after stat bonuses, then adds flat Evade', () => {
    expect(loadoutTotals(profile().stats, [item({ location: 'main-hand', bonuses: { ...ZERO_BONUSES, dexterity: 1, evade: 2 } })]).evade).toBe(5);
  });
  it.each([-1, 0.5, 1001, '2'])('rejects invalid bonus %s', (dr) => {
    expect(() => restoreBonuses({ ...ZERO_BONUSES, dr })).toThrow();
  });
  it('rejects incomplete bonus objects and bonuses on unequippable items', () => {
    expect(() => restoreBonuses({ strength: 1 })).toThrow();
    expect(() => validateInventory([item({ gearSlot: 'none', bonuses: { ...ZERO_BONUSES, strength: 1 } })])).toThrow('equippable');
  });
  it('rejects effective stats beyond the supported storage range', () => {
    const stats = profile().stats;
    expect(() => loadoutTotals({ ...stats, intelligence: { base: 6, enhanced: 10000 } }, [item({ location: 'main-hand', bonuses: { ...ZERO_BONUSES, intelligence: 1 } })])).toThrow();
  });
});
describe('Hotlist rules', () => {
  it('has exactly ten slots', () => {
    expect(restoreHotlist(empty(), [], profile()).length).toBe(10);
    expect(() => restoreHotlist([], [], profile())).toThrow('ten');
  });
  it('moves a stack reference rather than duplicating an item', () => {
    const first = assignHotlist(empty(), 1, { kind: 'item', target: ID });
    const moved = assignHotlist(first, 10, { kind: 'item', target: ID });
    expect(moved[0]).toBe(null); expect(moved[9]?.target).toBe(ID);
    expect(restoreHotlist(moved, [item({ quantity: 5 })], profile()).length).toBe(10);
  });
  it('clears or replaces only references', () => {
    const source = assignHotlist(empty(), 1, { kind: 'item', target: ID });
    expect(assignHotlist(source, 1, null)[0]).toBe(null); expect(source[0]?.target).toBe(ID);
  });
  it.each([0, 11, 1.5])('rejects slot %s', (slot) => { expect(() => assignHotlist(empty(), slot, null)).toThrow(); });
  it('rejects duplicate references, missing items, and unknown skills', () => {
    const source = assignHotlist(empty(), 1, { kind: 'item', target: ID });
    expect(() => restoreHotlist([{ kind: 'item', target: ID }, ...source.slice(0, 9)], [item()], profile())).toThrow('one Hotlist');
    expect(() => restoreHotlist(source, [], profile())).toThrow('unavailable');
    expect(() => restoreHotlist(assignHotlist(empty(), 1, { kind: 'skill', target: 'unknown' }), [], profile())).toThrow('unavailable');
  });
  it('allows Heal and a currently known Attack Spell', () => {
    const p = { ...profile(), combatId: 'fire-fingers' };
    const slots = assignHotlist(assignHotlist(empty(), 1, { kind: 'skill', target: 'heal' }), 2, { kind: 'skill', target: 'fire-fingers' });
    expect(restoreHotlist(slots, [], p)[1]?.target).toBe('fire-fingers');
    expect(() => restoreHotlist(slots, [], profile())).toThrow();
  });
  it('readies two-handed equipment atomically and leaves gloves on', () => {
    const source = [item({ gearSlot: 'two-hands' }), item({ id: OTHER, location: 'main-hand' }), item({ id: '77777777-7777-4777-8777-777777777777', gearSlot: 'hands', location: 'hands' })];
    const result = validateInventory(readyHotlistItem(source, ID, 'two-hands'));
    expect(result[0].location).toBe('two-hands'); expect(result[1].location).toBe('stored'); expect(result[2].location).toBe('hands');
    expect(source[0].location).toBe('stored');
  });
  it('a one-handed swap releases a conflicting two-handed item', () => {
    const result = validateInventory(readyHotlistItem([item(), item({ id: OTHER, gearSlot: 'two-hands', location: 'two-hands' })], ID, 'off-hand'));
    expect(result[0].location).toBe('off-hand'); expect(result[1].location).toBe('stored');
  });
  it('does not remove unrelated held equipment during a one-handed swap', () => {
    const result = readyHotlistItem([item(), item({ id: OTHER, location: 'off-hand' })], ID, 'main-hand'); expect(result[1].location).toBe('off-hand');
  });
  it('rejects readying armor, missing targets, and incompatible hand selections', () => {
    expect(() => readyHotlistItem([item({ gearSlot: 'head' })], ID, 'main-hand')).toThrow();
    expect(() => readyHotlistItem([], ID, 'main-hand')).toThrow();
    expect(() => readyHotlistItem([item({ gearSlot: 'two-hands' })], ID, 'main-hand')).toThrow();
  });
});
describe('DR before slot conversion', () => {
  it.each([[8, 3, 8], [2, 3, 10], [3, 3, 10], [100, 3, 0]])('raw %s with DR %s gives %s slots', (raw, dr, expected) => {
    expect(damageAfterDr(10, 3, raw, dr)).toBe(expected);
  });
  it('preserves zero health and rejects negative values', () => {
    expect(damageAfterDr(0, 3, 8, 3)).toBe(0); expect(() => damageAfterDr(10, 3, -1, 0)).toThrow();
  });
});
