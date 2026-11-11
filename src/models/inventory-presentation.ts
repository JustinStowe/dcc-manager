import type { InventoryItem } from '@/domain/inventory';
import type { EquipmentSlot, GameItem, GearSlot, ItemType } from '@/components/inventory-system';
import { restoreBonuses } from '@/domain/loadout';

const TYPES: Record<InventoryItem['kind'], ItemType> = { gear: 'Gear', weapon: 'Weapon', armor: 'Armor', consumable: 'Consumable', quest: 'Quest', misc: 'Misc' };
const SLOTS: Record<string, GearSlot> = { head: 'Head', torso: 'Torso', arms: 'Arms', legs: 'Legs', feet: 'Feet', hands: 'Hands', holding: 'Main hand', 'main-hand': 'Main hand', 'off-hand': 'Off hand', 'two-hands': 'Main hand', accessory: 'Accessory', belt: 'Accessory', cape: 'Accessory', none: 'None', stored: 'None' };
const FIXED = ['head', 'torso', 'arms', 'legs', 'feet', 'hands', 'main-hand', 'off-hand', 'belt', 'cape'];
export function buildInventoryPresentation(source: readonly InventoryItem[]) {
  const items: GameItem[] = [];
  const sourceById: Record<string, InventoryItem> = {};
  for (const item of source) {
    const equipped = item.location !== 'stored';
    const bonusText = Object.entries(restoreBonuses(item.bonuses)).filter(([, value]) => value > 0).map(([key, value]) => key === 'dr' ? `DR +${value}` : key === 'evade' ? `Evade +${value}` : `Enhanced ${key} +${value} points`).join(', ');
    const common = { name: item.name, type: TYPES[item.kind], description: `${item.location === 'two-hands' ? 'Occupies both hands.\n' : item.location === 'belt' || item.location === 'cape' ? `Equipment location: ${item.location}.\n` : ''}${bonusText ? `While equipped: ${bonusText}.\n` : ''}${item.notes}` };
    if (equipped) {
      const id = `${item.id}:equipped`;
      items.push({ ...common, id, quantity: 1, gearSlot: SLOTS[item.location], isEquipped: true });
      sourceById[id] = item;
    }
    const remaining = item.quantity - (equipped ? 1 : 0);
    if (remaining > 0) {
      const id = `${item.id}:stored`;
      items.push({ ...common, id, quantity: remaining, gearSlot: equipped ? 'None' : SLOTS[item.gearSlot], isEquipped: false });
      sourceById[id] = item;
    }
  }
  const equipmentSlots: EquipmentSlot[] = FIXED.map((location) => {
    const item = source.find((entry) => entry.location === location || (entry.location === 'two-hands' && (location === 'main-hand' || location === 'off-hand')));
    return { id: location, label: location === 'belt' ? 'Belt' : location === 'cape' ? 'Cape' : SLOTS[location], slot: SLOTS[location], ...(item ? { itemId: `${item.id}:equipped` } : {}) };
  });
  const accessories = source.filter((item) => item.location === 'accessory');
  accessories.forEach((item, i) => equipmentSlots.push({ id: `accessory-${i}`, label: `Accessory ${i + 1}`, slot: 'Accessory', itemId: `${item.id}:equipped` }));
  const accessoryCount = source.filter((item) => ['accessory', 'belt', 'cape'].includes(item.location)).length;
  if (accessoryCount < 10) equipmentSlots.push({ id: 'accessory-empty', label: `Accessory ${accessories.length + 1}`, slot: 'Accessory' });
  return { items, equipmentSlots, sourceById, accessoryCount };
}
