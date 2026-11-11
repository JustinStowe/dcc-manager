import { restoreBonuses, type GearBonuses } from './loadout';
export const ITEM_KINDS = ['weapon', 'armor', 'consumable', 'gear', 'quest', 'misc'] as const;
export const GEAR_SLOTS = ['none', 'head', 'torso', 'arms', 'legs', 'feet', 'hands', 'holding', 'two-hands', 'accessory', 'belt', 'cape'] as const;
export const EQUIPMENT_LOCATIONS = ['stored', 'head', 'torso', 'arms', 'legs', 'feet', 'hands', 'main-hand', 'off-hand', 'two-hands', 'accessory', 'belt', 'cape'] as const;
export type ItemKind = typeof ITEM_KINDS[number];
export type GearSlot = typeof GEAR_SLOTS[number];
export type EquipmentLocation = typeof EQUIPMENT_LOCATIONS[number];
export const ITEM_EFFECTS = ['manual', 'mana-full'] as const;
export type ItemEffect = typeof ITEM_EFFECTS[number];
export interface InventoryItem {
  readonly id: string;
  readonly name: string;
  readonly kind: ItemKind;
  readonly quantity: number;
  readonly notes: string;
  readonly gearSlot: GearSlot;
  readonly location: EquipmentLocation;
  readonly effect?: ItemEffect;
  readonly bonuses?: GearBonuses;
}
export type ItemDraft = Omit<InventoryItem, 'id' | 'location' | 'bonuses'>;
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
  const kind = choice(row.kind, ITEM_KINDS);
  const effect = row.effect === undefined ? undefined : choice(row.effect, ITEM_EFFECTS);
  if (effect === 'mana-full' && kind !== 'consumable') throw new RangeError('A Mana potion effect requires a consumable.');
  return { name: text(row.name, 120, true), kind, quantity: itemQuantity(row.quantity), notes: text(row.notes, 2000), gearSlot: choice(row.gearSlot, GEAR_SLOTS), ...(effect === undefined ? {} : { effect }) };
}
export function itemEffect(item: Pick<InventoryItem, 'effect'>): ItemEffect { return item.effect ?? 'manual'; }
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
    const item: InventoryItem = { ...validateItemDraft(row), id, location: choice(row.location, EQUIPMENT_LOCATIONS), ...(row.bonuses === undefined ? {} : { bonuses: restoreBonuses(row.bonuses) }) };
    if (item.gearSlot === 'none' && item.bonuses && Object.values(item.bonuses).some((value) => value !== 0)) throw new RangeError('Gear bonuses require an equippable item.');
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
  | { readonly operation: 'classify'; readonly itemId: string; readonly effect: ItemEffect }
  | { readonly operation: 'consume' | 'remove' | 'drink-mana'; readonly itemId: string };

export function changeInventory(current: readonly InventoryItem[], command: InventoryMutation): readonly InventoryItem[] {
  const items = validateInventory(current);
  if (command.operation === 'add') return validateInventory([...items, { ...command.item, id: command.id, location: 'stored' }]);
  const target = items.find((item) => item.id === command.itemId);
  if (!target) throw new RangeError('Item not found. Refresh the campaign.');
  if (command.operation === 'remove') return items.filter((item) => item.id !== target.id);
  if (command.operation === 'consume' && target.kind !== 'consumable') throw new RangeError('Only consumables can use this action.');
  if (command.operation === 'consume' && itemEffect(target) !== 'manual') throw new RangeError('Use the supported potion action for this item.');
  if (command.operation === 'drink-mana' && (target.kind !== 'consumable' || itemEffect(target) !== 'mana-full')) throw new RangeError('Choose an identified Standard Mana Potion.');
  return validateInventory(items.flatMap((item) => {
    if (item.id !== target.id) return [item];
    if (command.operation === 'edit') {
      const draft = validateItemDraft(command.item);
      if (draft.kind !== item.kind || draft.gearSlot !== item.gearSlot || itemEffect(draft) !== itemEffect(item)) throw new RangeError('Item type, gear slot, and effect are fixed. Use GM classification to correct an effect.');
      return [{ ...item, ...draft }];
    }
    if (command.operation === 'equip') return [{ ...item, location: command.location }];
    if (command.operation === 'classify') return [{ ...item, effect: command.effect }];
    return item.quantity === 1 ? [] : [{ ...item, quantity: item.quantity - 1 }];
  }));
}
