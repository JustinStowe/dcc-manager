export const ITEM_KINDS = ['weapon', 'armor', 'consumable', 'gear', 'quest', 'misc'] as const;
export const GEAR_SLOTS = ['none', 'head', 'torso', 'arms', 'legs', 'feet', 'hands', 'holding', 'two-hands', 'accessory', 'belt', 'cape'] as const;
export const EQUIPMENT_LOCATIONS = ['stored', 'head', 'torso', 'arms', 'legs', 'feet', 'hands', 'main-hand', 'off-hand', 'two-hands', 'accessory', 'belt', 'cape'] as const;
export type ItemKind = typeof ITEM_KINDS[number];
export type GearSlot = typeof GEAR_SLOTS[number];
export type EquipmentLocation = typeof EQUIPMENT_LOCATIONS[number];
export interface InventoryItem {
  readonly id: string;
  readonly name: string;
  readonly kind: ItemKind;
  readonly quantity: number;
  readonly notes: string;
  readonly gearSlot: GearSlot;
  readonly location: EquipmentLocation;
}
export type ItemDraft = Omit<InventoryItem, 'id' | 'location'>;
export const MAX_INVENTORY_ENTRIES = 200;
export const MAX_ITEM_QUANTITY = 999999;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RangeError('Invalid inventory item.');
  return value as Record<string, unknown>;
}
function text(value: unknown, maximum: number, required = false): string {
  if (typeof value !== 'string' || Array.from(value).length > maximum || (required && !value.trim())) throw new RangeError('Enter a valid item name or notes.');
  return value.trim();
}
function choice<T extends string>(value: unknown, options: readonly T[]): T {
  if (typeof value !== 'string' || !options.includes(value as T)) throw new RangeError('Choose a valid item type or equipment slot.');
  return value as T;
}
export function itemQuantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > MAX_ITEM_QUANTITY) throw new RangeError(`Quantity must be a whole number from 1 to ${MAX_ITEM_QUANTITY}.`);
  return value;
}
export function validateItemDraft(value: unknown): ItemDraft {
  const row = object(value);
  return { name: text(row.name, 120, true), kind: choice(row.kind, ITEM_KINDS), quantity: itemQuantity(row.quantity), notes: text(row.notes, 2000), gearSlot: choice(row.gearSlot, GEAR_SLOTS) };
}
export function equipmentLocations(slot: GearSlot): readonly EquipmentLocation[] {
  if (slot === 'none') return ['stored'];
  if (slot === 'holding') return ['stored', 'main-hand', 'off-hand'];
  return ['stored', slot];
}
export function validateInventory(value: unknown): readonly InventoryItem[] {
  if (!Array.isArray(value) || value.length > MAX_INVENTORY_ENTRIES) throw new RangeError('Inventory supports up to 200 entries.');
  const ids = new Set<string>();
  const occupied = new Set<string>();
  let accessories = 0;
  return value.map((raw) => {
    const row = object(raw);
    if (typeof row.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)) throw new RangeError('Invalid inventory item ID.');
    const id = row.id.toLowerCase();
    if (ids.has(id)) throw new RangeError('Duplicate inventory item ID.');
    ids.add(id);
    const item: InventoryItem = { ...validateItemDraft(row), id, location: choice(row.location, EQUIPMENT_LOCATIONS) };
    if (!equipmentLocations(item.gearSlot).includes(item.location)) throw new RangeError('This item cannot use that equipment slot.');
    const location = item.location;
    if (location === 'stored') return item;
    if (['accessory', 'belt', 'cape'].includes(location)) {
      accessories++;
      if (accessories > 10) throw new RangeError('Only ten accessories may be equipped.');
      if (location === 'accessory') return item;
    }
    const slots = location === 'two-hands' ? ['main-hand', 'off-hand'] : [location];
    for (const slot of slots) {
      if (occupied.has(slot)) throw new RangeError('That equipment slot is occupied. Unequip the other item first.');
      occupied.add(slot);
    }
    return item;
  });
}
export type InventoryMutation =
  | { readonly operation: 'add'; readonly item: ItemDraft; readonly id: string }
  | { readonly operation: 'edit'; readonly itemId: string; readonly item: ItemDraft }
  | { readonly operation: 'equip'; readonly itemId: string; readonly location: EquipmentLocation }
  | { readonly operation: 'consume' | 'remove'; readonly itemId: string };

export function changeInventory(current: readonly InventoryItem[], command: InventoryMutation): readonly InventoryItem[] {
  const items = validateInventory(current);
  if (command.operation === 'add') return validateInventory([...items, { ...command.item, id: command.id, location: 'stored' }]);
  const target = items.find((item) => item.id === command.itemId);
  if (!target) throw new RangeError('Item not found. Refresh the campaign.');
  if (command.operation === 'remove') return items.filter((item) => item.id !== target.id);
  if (command.operation === 'consume' && target.kind !== 'consumable') throw new RangeError('Only consumables can use this action.');
  return validateInventory(items.flatMap((item) => {
    if (item.id !== target.id) return [item];
    if (command.operation === 'edit') {
      const draft = validateItemDraft(command.item);
      if (draft.kind !== item.kind || draft.gearSlot !== item.gearSlot) throw new RangeError('Item type and gear slot are fixed. Remove this entry and add a corrected item.');
      return [{ ...item, ...draft }];
    }
    if (command.operation === 'equip') return [{ ...item, location: command.location }];
    return item.quantity === 1 ? [] : [{ ...item, quantity: item.quantity - 1 }];
  }));
}
