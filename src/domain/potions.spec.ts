import { describe, expect, it } from 'vitest';
import { drinkStandardManaPotion } from './potions';
import { changeInventory, itemEffect, validateInventory, type InventoryItem } from './inventory';
import { createTutorialProfile } from './tutorial';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';

const ID = '66666666-6666-4666-8666-666666666666';
function potion(changes: Partial<InventoryItem> = {}): InventoryItem {
  return { id: ID, name: 'Renamed blue bottle', quantity: 2, kind: 'consumable', gearSlot: 'none', location: 'stored', notes: '', effect: 'mana-full', ...changes };
}
function profile(mana = 1) { return { ...createTutorialProfile(tutorialDraftFixture()), mana }; }
describe('Standard Mana Potion automation', () => {
  it('restores the current Enhanced Intelligence maximum and consumes one', () => {
    const items = [potion()]; const before = profile();
    const result = drinkStandardManaPotion(items, before, 10, ID);
    expect(result.profile.mana).toBe(6); expect(result.inventory[0].quantity).toBe(1);
    expect(before.mana).toBe(1); expect(items[0].quantity).toBe(2);
  });
  it('removes the last potion and preserves other resources and identity', () => {
    const before = { ...profile(), favor: 8 }; const result = drinkStandardManaPotion([potion({ quantity: 1 })], before, 7, ID);
    expect(result.inventory.length).toBe(0); expect(result.profile.favor).toBe(8); expect(result.profile.stats).toEqual(before.stats);
  });
  it('uses GM-corrected Enhanced Intelligence rather than starting stats', () => {
    const before = profile(0); const enhanced = { ...before, stats: { ...before.stats, intelligence: { base: 6, enhanced: 20 } } };
    expect(drinkStandardManaPotion([potion()], enhanced, 1, ID).profile.mana).toBe(20);
  });
  it('refuses use at full Mana without mutating quantity', () => {
    const items = [potion()]; expect(() => drinkStandardManaPotion(items, profile(6), 10, ID)).toThrow('already full'); expect(items[0].quantity).toBe(2);
  });
  it('refuses self-use while Dying', () => {
    expect(() => drinkStandardManaPotion([potion()], profile(), 0, ID)).toThrow('Dying');
  });
  it.each([-1, 11, 0.5])('rejects invalid health %s', (slots) => {
    expect(() => drinkStandardManaPotion([potion()], profile(), slots, ID)).toThrow();
  });
  it.each([-1, 7, 0.5])('rejects invalid current Mana %s', (mana) => {
    expect(() => drinkStandardManaPotion([potion()], profile(mana), 10, ID)).toThrow();
  });
  it('does not infer an effect from a name or legacy missing field', () => {
    const legacy = potion({ name: 'Standard Mana Potion', effect: undefined });
    expect(itemEffect(legacy)).toBe('manual');
    expect(() => drinkStandardManaPotion([legacy], profile(), 10, ID)).toThrow('identified');
    expect(changeInventory([legacy], { operation: 'consume', itemId: ID })[0].quantity).toBe(1);
  });
  it('rejects unsupported effects and effects on nonconsumables', () => {
    expect(() => validateInventory([{ ...potion(), effect: 'health-full' }])).toThrow();
    expect(() => validateInventory([potion({ kind: 'weapon' })])).toThrow('consumable');
  });
  it('blocks generic consumption of an automated item', () => {
    expect(() => changeInventory([potion()], { operation: 'consume', itemId: ID })).toThrow('supported');
  });
  it('rejects an unavailable item without changing any existing entry', () => {
    expect(() => drinkStandardManaPotion([], profile(), 10, ID)).toThrow('not found');
  });
  it('allows explicit classification without changing resources or quantities', () => {
    const result = changeInventory([potion({ effect: undefined })], { operation: 'classify', itemId: ID, effect: 'mana-full' });
    expect(itemEffect(result[0])).toBe('mana-full'); expect(result[0].quantity).toBe(2);
  });
  it('does not allow ordinary item editing to change the effect', () => {
    expect(() => changeInventory([potion()], { operation: 'edit', itemId: ID, item: potion({ effect: 'manual' }) })).toThrow('fixed');
  });
});
