import { describe, expect, it } from 'vitest';
import { buildInventoryPresentation } from './inventory-presentation';
import type { InventoryItem } from '@/domain/inventory';

const item: InventoryItem = { id: 'one', name: 'Sword', kind: 'weapon', quantity: 5, gearSlot: 'holding', location: 'stored', notes: 'Keeps its notes' };
describe('Inventory UI projection', () => {
  it('shows stored quantities and maps type labels without changing the source', () => {
    const result = buildInventoryPresentation([item]);
    expect(result.items[0].quantity).toBe(5); expect(result.items[0].type).toBe('Weapon'); expect(result.items[0].isEquipped).toBe(false);
    expect(result.sourceById[result.items[0].id]).toBe(item); expect(item.location).toBe('stored');
  });
  it('keeps remaining copies in the grid while exactly one is equipped', () => {
    const result = buildInventoryPresentation([{ ...item, location: 'main-hand' }]);
    expect(result.items.length).toBe(2); expect(result.items.find((entry) => entry.isEquipped)?.quantity).toBe(1);
    expect(result.items.find((entry) => !entry.isEquipped)?.quantity).toBe(4);
    expect(result.equipmentSlots.find((slot) => slot.id === 'main-hand')?.itemId).toBe('one:equipped');
  });
  it('does not create zero-quantity stored copies', () => {
    const result = buildInventoryPresentation([{ ...item, quantity: 1, location: 'main-hand' }]);
    expect(result.items.length).toBe(1); expect(result.items[0].isEquipped).toBe(true);
  });
  it('uses the same two-handed item in both holding slots', () => {
    const result = buildInventoryPresentation([{ ...item, gearSlot: 'two-hands', location: 'two-hands' }]);
    const main = result.equipmentSlots.find((slot) => slot.id === 'main-hand');
    const off = result.equipmentSlots.find((slot) => slot.id === 'off-hand');
    expect(main?.itemId).toBe(off?.itemId); expect(result.items[0].description).toBe('Occupies both hands.\nKeeps its notes');
  });
  it('keeps gloves distinct from holding slots', () => {
    const result = buildInventoryPresentation([{ ...item, gearSlot: 'hands', location: 'hands' }]);
    expect(result.equipmentSlots.find((slot) => slot.id === 'hands')?.itemId).toBe('one:equipped');
    expect(result.equipmentSlots.find((slot) => slot.id === 'main-hand')?.itemId).toBe(undefined);
  });
  it('keeps accessories, belt and cape represented and counted', () => {
    const source = ['accessory', 'belt', 'cape'].map((location, i) => ({ ...item, id: String(i), quantity: 1, gearSlot: location, location } as InventoryItem));
    const result = buildInventoryPresentation(source);
    expect(result.accessoryCount).toBe(3); expect(result.equipmentSlots.find((slot) => slot.id === 'belt')?.itemId).toBe('1:equipped');
    expect(result.equipmentSlots.find((slot) => slot.id === 'cape')?.itemId).toBe('2:equipped');
    expect(result.equipmentSlots.find((slot) => slot.id === 'accessory-0')?.itemId).toBe('0:equipped');
  });
  it('does not suggest an additional accessory space when ten are equipped', () => {
    const result = buildInventoryPresentation(Array.from({ length: 10 }, (_, i) => ({ ...item, id: String(i), gearSlot: 'accessory', location: 'accessory', quantity: 1 })));
    expect(result.equipmentSlots.find((slot) => slot.id === 'accessory-empty')).toBe(undefined);
  });
  it('handles an empty inventory with visible empty equipment slots', () => {
    const result = buildInventoryPresentation([]); expect(result.items.length).toBe(0); expect(result.equipmentSlots.length).toBe(11);
  });
});
