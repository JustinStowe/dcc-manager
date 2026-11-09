import { getCampaignRole } from '@/domain';
import { changeInventory, EQUIPMENT_LOCATIONS, ITEM_EFFECTS, validateItemDraft, type InventoryItem, type ItemDraft, type EquipmentLocation, type ItemEffect } from '@/domain/inventory';
import { drinkStandardManaPotion } from '@/domain/potions';
import { requireUuid, type CampaignWorkspace } from './campaign-workspace';

export interface InventoryWrite {
  readonly crawlerId: string;
  readonly version: string;
  readonly operation: 'add' | 'edit' | 'equip' | 'consume' | 'remove' | 'drink-mana' | 'classify';
  readonly itemId: string | null;
  readonly item: ItemDraft | null;
  readonly location: EquipmentLocation | null;
  readonly effect?: ItemEffect;
}
export interface InventoryPort { act(input: InventoryWrite): Promise<void> }
function text(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== 'string' || !value.trim()) throw new RangeError(`Enter ${key}.`);
  return value.trim();
}
export async function executeInventoryCommand(workspace: CampaignWorkspace, form: FormData, port: InventoryPort): Promise<string> {
  const { campaign, userId } = workspace;
  if (!campaign) throw new Error('This game is no longer available. Return to the lobby.');
  const crawlerId = requireUuid(text(form, 'crawlerId'));
  const entry = campaign.crawlers.find((candidate) => candidate.crawler.id === crawlerId);
  const role = getCampaignRole(campaign, userId);
  if (!entry || !role || (role !== 'gm' && entry.ownerUserId !== userId)) throw new Error('You do not have permission to change this inventory.');
  if (entry.crawler.ruleset !== 'tutorial-v1') throw new Error('The GM must convert this prototype before using inventory.');
  const version = requireUuid(text(form, 'version'));
  if (workspace.versions[crawlerId] !== version) throw new Error('Crawler changed. Refresh the campaign before trying again.');
  const current: readonly InventoryItem[] | undefined = workspace.inventories?.[crawlerId];
  if (!current) throw new Error('Inventory could not be loaded. Refresh the campaign.');
  const operation = text(form, 'operation');
  if (!['add', 'edit', 'equip', 'consume', 'remove', 'drink-mana', 'classify'].includes(operation)) throw new RangeError('Choose an inventory action.');
  const itemId = operation === 'add' ? null : requireUuid(text(form, 'itemId'));
  const item = operation === 'add' || operation === 'edit' ? validateItemDraft({
    name: text(form, 'name'), quantity: Number(text(form, 'quantity')), kind: text(form, 'kind'),
    gearSlot: text(form, 'gearSlot'), notes: form.get('notes') ?? '', ...(form.has('effect') ? { effect: text(form, 'effect') } : {}),
  }) : null;
  let location: EquipmentLocation | null = null;
  if (operation === 'equip') {
    const value = text(form, 'location') as EquipmentLocation;
    if (!EQUIPMENT_LOCATIONS.includes(value)) throw new RangeError('Choose a valid equipment slot.');
    location = value;
  }
  if (operation === 'remove' && form.get('confirmed') !== 'yes') throw new RangeError('Confirm removal of this entire entry.');
  if (operation === 'consume' && form.get('confirmed') !== 'yes') throw new RangeError('Confirm using one item; resolve its effects at the table.');
  let effect: ItemEffect | undefined;
  if (operation === 'classify') {
    if (role !== 'gm') throw new Error('Only the GM can reclassify an existing item effect.');
    effect = text(form, 'effect') as ItemEffect;
    if (!ITEM_EFFECTS.includes(effect)) throw new RangeError('Choose a supported item effect.');
  }
  // A placeholder UUID checks the new entry shape; the database generates the real ID.
  if (operation === 'add') changeInventory(current, { operation, item: item!, id: '00000000-0000-4000-8000-000000000000' });
  else if (operation === 'edit') changeInventory(current, { operation, item: item!, itemId: itemId! });
  else if (operation === 'equip') changeInventory(current, { operation, location: location!, itemId: itemId! });
  else if (operation === 'classify') changeInventory(current, { operation, effect: effect!, itemId: itemId! });
  else if (operation === 'drink-mana') {
    if (form.get('confirmed') !== 'yes') throw new RangeError('Confirm the crawler can drink and potion timing is valid.');
    const profile = workspace.tutorials?.[crawlerId]?.profile;
    if (!profile) throw new Error('Crawler resources could not be loaded. Refresh the campaign.');
    drinkStandardManaPotion(current, profile, entry.crawler.currentSegments, itemId!);
  }
  else changeInventory(current, { operation: operation as 'consume' | 'remove', itemId: itemId! });
  await port.act({ crawlerId, version, operation: operation as InventoryWrite['operation'], itemId, item, location, ...(effect ? { effect } : {}) });
  if (operation === 'drink-mana') return 'One Standard Mana Potion used. Mana fully restored.';
  return operation === 'consume' ? 'One item used. Apply its effects separately at the table.' : 'Inventory saved.';
}
