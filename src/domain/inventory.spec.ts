import { describe, expect, it } from 'vitest';
import { changeInventory, equipmentLocations, validateInventory, validateItemDraft, type InventoryItem } from './inventory';

function item(index = 1, changes: Partial<InventoryItem> = {}): InventoryItem {
  return { id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`, name: 'Sword', kind: 'weapon', quantity: 1, notes: '', gearSlot: 'holding', location: 'stored', ...changes };
}
describe('Inventory and equipment rules', () => {
  it('trims names and notes without mutating input', () => {
    const source = item(1, { name: ' Sword ', notes: ' Note ' });
    expect(validateItemDraft(source).name).toBe('Sword');
    expect(validateItemDraft(source).notes).toBe('Note');
    expect(source.name).toBe(' Sword ');
  });
  it.each([0, -1, 1.5, 1000000, NaN, '2'])('rejects invalid quantity %s', (quantity) => {
    expect(() => validateItemDraft({ ...item(), quantity })).toThrow();
  });
  it.each([{ name: ' ' }, { name: 'x'.repeat(121) }, { notes: 'x'.repeat(2001) }, { kind: 'money' }, { gearSlot: 'helmet' }])('rejects invalid item fields %s', (fields) => {
    expect(() => validateItemDraft({ ...item(), ...fields })).toThrow();
  });
  it('accepts empty inventories but fails closed on missing or malformed storage', () => {
    expect(validateInventory([]).length).toBe(0);
    expect(() => validateInventory(null)).toThrow();
    expect(() => validateInventory({})).toThrow();
  });
  it('rejects duplicate IDs and unsupported locations', () => {
    expect(() => validateInventory([item(), item()])).toThrow('Duplicate');
    expect(() => validateInventory([item(1, { location: 'head' })])).toThrow('cannot');
  });
  it('adds separate entries, starts stored, and leaves the input unchanged', () => {
    const before = [item()];
    const result = changeInventory(before, { operation: 'add', item: item(2), id: item(2).id });
    expect(result.length).toBe(2); expect(result[1].location).toBe('stored'); expect(before.length).toBe(1);
  });
  it('limits the number of entries without imposing carried weight', () => {
    const full = Array.from({ length: 200 }, (_, index) => item(index + 1));
    expect(validateInventory(full).length).toBe(200);
    expect(() => changeInventory(full, { operation: 'add', item: item(201), id: item(201).id })).toThrow('200');
  });
  it('rejects occupying the same clothing slot twice', () => {
    expect(() => validateInventory([item(1, { gearSlot: 'head', location: 'head' }), item(2, { gearSlot: 'head', location: 'head' })])).toThrow('occupied');
  });
  it('allows gloves alongside one item in each hand', () => {
    expect(validateInventory([item(1, { gearSlot: 'hands', location: 'hands' }), item(2, { location: 'main-hand' }), item(3, { location: 'off-hand' })]).length).toBe(3);
  });
  it.each(['main-hand', 'off-hand'] as const)('two-handed gear conflicts with %s', (location) => {
    expect(() => validateInventory([item(1, { gearSlot: 'two-hands', location: 'two-hands' }), item(2, { location })])).toThrow('occupied');
    expect(() => validateInventory([item(2, { location }), item(1, { gearSlot: 'two-hands', location: 'two-hands' })])).toThrow('occupied');
  });
  it('allows ten accessories including one belt and one cape, rejecting an eleventh', () => {
    const items = Array.from({ length: 8 }, (_, i) => item(i + 1, { gearSlot: 'accessory', location: 'accessory' }));
    items.push(item(9, { gearSlot: 'belt', location: 'belt' }), item(10, { gearSlot: 'cape', location: 'cape' }));
    expect(validateInventory(items).length).toBe(10);
    expect(() => validateInventory([...items, item(11, { gearSlot: 'accessory', location: 'accessory' })])).toThrow('ten');
  });
  it.each(['belt', 'cape'] as const)('rejects equipping two entries in the %s slot', (gearSlot) => {
    expect(() => validateInventory([item(1, { gearSlot, location: gearSlot }), item(2, { gearSlot, location: gearSlot })])).toThrow('occupied');
  });
  it('equips one item from a quantity and storing it releases the slot', () => {
    const before = [item(1, { quantity: 5 })];
    const equipped = changeInventory(before, { operation: 'equip', itemId: item().id, location: 'main-hand' });
    expect(equipped[0].quantity).toBe(5); expect(before[0].location).toBe('stored');
    const stored = changeInventory(equipped, { operation: 'equip', itemId: item().id, location: 'stored' });
    expect(stored[0].location).toBe('stored');
  });
  it('edits name, quantity, notes while preserving ID and equipment', () => {
    const before = [item(1, { location: 'main-hand' })];
    const result = changeInventory(before, { operation: 'edit', itemId: item().id, item: { ...item(), name: 'New sword', quantity: 2 } });
    expect(result[0].id).toBe(item().id); expect(result[0].location).toBe('main-hand'); expect(result[0].quantity).toBe(2);
  });
  it('rejects silently reclassifying an equipped item', () => {
    expect(() => changeInventory([item()], { operation: 'edit', itemId: item().id, item: { ...item(), gearSlot: 'two-hands' } })).toThrow('fixed');
  });
  it('consumes one item and removes the final one without negative quantities', () => {
    const before = [item(1, { kind: 'consumable', quantity: 2, gearSlot: 'none' })];
    const once = changeInventory(before, { operation: 'consume', itemId: item().id });
    expect(once[0].quantity).toBe(1); expect(before[0].quantity).toBe(2);
    expect(changeInventory(once, { operation: 'consume', itemId: item().id }).length).toBe(0);
  });
  it('rejects consuming nonconsumables and missing item IDs', () => {
    expect(() => changeInventory([item()], { operation: 'consume', itemId: item().id })).toThrow('Only consumables');
    expect(() => changeInventory([], { operation: 'remove', itemId: item().id })).toThrow('not found');
  });
  it('removes an entire quantity without changing another entry', () => {
    expect(changeInventory([item(1, { quantity: 10 }), item(2)], { operation: 'remove', itemId: item().id })).toEqual([item(2)]);
  });
  it('offers only item-compatible equipment locations', () => {
    expect(equipmentLocations('none')).toEqual(['stored']);
    expect(equipmentLocations('holding')).toEqual(['stored', 'main-hand', 'off-hand']);
    expect(equipmentLocations('head')).toEqual(['stored', 'head']);
  });
});
