import { changeInventory, type InventoryItem } from './inventory';
import type { TutorialProfile } from './tutorial';

export function drinkStandardManaPotion(items: readonly InventoryItem[], profile: TutorialProfile, healthSlots: number, itemId: string) {
  if (!Number.isSafeInteger(healthSlots) || healthSlots < 0 || healthSlots > 10) throw new RangeError('Invalid health slots.');
  if (healthSlots === 0) throw new RangeError('A Dying crawler cannot drink a potion themselves.');
  const maximum = profile.stats.intelligence.enhanced;
  if (!Number.isSafeInteger(profile.mana) || !Number.isSafeInteger(maximum) || maximum < 1 || profile.mana < 0 || profile.mana > maximum) throw new RangeError('Invalid Mana values.');
  if (profile.mana === maximum) throw new RangeError('Mana is already full. No potion was spent.');
  const inventory = changeInventory(items, { operation: 'drink-mana', itemId });
  return { inventory, profile: { ...profile, mana: maximum } };
}
