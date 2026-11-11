import { CampaignForm } from '@/components/campaign-form';
import InventorySystem, { type ItemActionPanels } from '@/components/inventory-system';
import { inventoryAction } from '@/app/campaign/inventory-actions';
import { equipmentLocations, GEAR_SLOTS, ITEM_KINDS, MAX_INVENTORY_ENTRIES, MAX_ITEM_QUANTITY, itemEffect, type InventoryItem } from '@/domain/inventory';
import { buildInventoryPresentation } from '@/models/inventory-presentation';
import styles from '@/styles/campaign.module.css';
import type { TutorialStats } from '@/domain/tutorial';
import { GearBonusesView } from '@/views/gear-bonuses-view';

const labels: Record<string, string> = { none: 'Cannot equip', stored: 'Inventory', hands: 'Hands (gloves)', holding: 'One hand (weapon, shield, or held item)', 'main-hand': 'Main hand', 'off-hand': 'Off hand', 'two-hands': 'Both hands', accessory: 'Accessory', belt: 'Belt', cape: 'Cape' };
function label(value: string) { return labels[value] ?? value[0].toUpperCase() + value.slice(1); }
function ItemFields({ item }: { item?: InventoryItem }) {
  return <>
    <label>Item name<input name="name" required maxLength={120} defaultValue={item?.name ?? ''} /></label>
    <label>Quantity<input name="quantity" type="number" min={1} max={MAX_ITEM_QUANTITY} step={1} required defaultValue={item?.quantity ?? 1} /></label>
    {item ? <><input type="hidden" name="kind" value={item.kind} /><input type="hidden" name="gearSlot" value={item.gearSlot} /><input type="hidden" name="effect" value={itemEffect(item)} /><p>Type: {label(item.kind)} · Gear slot: {label(item.gearSlot)}. To correct these, remove this entry and add the corrected item.</p></> : <>
      <label>Type<select name="kind" defaultValue="gear">{ITEM_KINDS.map((kind) => <option key={kind} value={kind}>{label(kind)}</option>)}</select></label>
      <label>Gear slot from the item description<select name="gearSlot" defaultValue="none">{GEAR_SLOTS.map((slot) => <option key={slot} value={slot}>{label(slot)}</option>)}</select></label>
      <label>Use effect<select name="effect" defaultValue="manual"><option value="manual">Manual / custom item</option><option value="mana-full">Standard Mana Potion (consumable only)</option></select></label>
    </>}
    <label>Item notes and effects<textarea name="notes" rows={3} maxLength={2000} defaultValue={item?.notes ?? ''} /></label>
  </>;
}
export function InventoryView({ campaignId, crawlerId, version, items, isGm, mana, maxMana, healthSlots, baseline }: {
  campaignId: string; crawlerId: string; version: string; items: readonly InventoryItem[]; isGm: boolean;
  mana?: number; maxMana?: number; healthSlots?: number;
  baseline?: TutorialStats;
}) {
  const presentation = buildInventoryPresentation(items);
  const itemActions: Record<string, ItemActionPanels> = {};
  for (const displayed of presentation.items) {
    const item = presentation.sourceById[displayed.id];
    const hidden = <><input type="hidden" name="crawlerId" value={crawlerId} /><input type="hidden" name="version" value={version} /><input type="hidden" name="itemId" value={item.id} /></>;
    const equip = item.gearSlot === 'none' || (!displayed.isEquipped && item.location !== 'stored') ? undefined : <CampaignForm key={`equip-${item.id}-${version}`} campaignId={campaignId} submitAction={inventoryAction} label={displayed.isEquipped ? `Unequip ${item.name}` : `Equip ${item.name}`}>
      {hidden}<input type="hidden" name="operation" value="equip" />
      {displayed.isEquipped ? <input type="hidden" name="location" value="stored" /> : <label>Equipment slot<select name="location" defaultValue={equipmentLocations(item.gearSlot)[1]}>{equipmentLocations(item.gearSlot).filter((location) => location !== 'stored').map((location) => <option key={location} value={location}>{label(location)}</option>)}</select></label>}
      <div>Occupied slots are rejected. Gloves are separate from held items; two-handed gear occupies both hands.</div><button type="submit">{displayed.isEquipped ? 'Unequip item' : 'Equip item'}</button>
    </CampaignForm>;
    const use = item.kind !== 'consumable' ? undefined : <CampaignForm key={`use-${item.id}-${version}`} campaignId={campaignId} submitAction={inventoryAction} label={`Use ${item.name}`}>
      {hidden}<input type="hidden" name="operation" value={itemEffect(item) === 'mana-full' ? 'drink-mana' : 'consume'} />
      <div>{itemEffect(item) === 'mana-full' ? 'Spends one potion and fully restores Mana in the same save. Full Mana and Dying block use.' : 'Spends one item only. Resolve custom effects separately at the table.'}</div>
      <label><input type="checkbox" name="confirmed" value="yes" required /> Confirm the crawler can use this item and potion Action/Interrupt and every-other-round timing are valid.</label>
      <button type="submit" disabled={itemEffect(item) === 'mana-full' && (healthSlots === undefined || healthSlots === 0 || mana === undefined || maxMana === undefined || mana >= maxMana)}>{itemEffect(item) === 'mana-full' ? 'Use potion · restore all Mana' : 'Use one item'}</button>
    </CampaignForm>;
    itemActions[displayed.id] = {
      equip, use,
      edit: <CampaignForm key={`edit-${item.id}-${version}`} campaignId={campaignId} submitAction={inventoryAction} label={`Edit ${item.name}`}>
        {hidden}<input type="hidden" name="operation" value="edit" />
        <div>Quantity is the total for this entry, including its equipped copy: {item.quantity}.</div><ItemFields item={item} /><button type="submit">Save item</button>
      </CampaignForm>,
      drop: <CampaignForm key={`drop-${item.id}-${version}`} campaignId={campaignId} submitAction={inventoryAction} label={`Drop ${item.name}`}>
        {hidden}<input type="hidden" name="operation" value="remove" />
        <label><input type="checkbox" name="confirmed" value="yes" required /> Drop this entire entry: {item.quantity} items{item.location !== 'stored' ? ', including the equipped copy' : ''}. This does not transfer items to another crawler.</label><button type="submit" className={styles.danger}>Confirm drop of entire entry</button>
      </CampaignForm>,
      extra: !isGm || (item.kind !== 'consumable' && (item.gearSlot === 'none' || !baseline)) ? undefined : <>{item.kind === 'consumable' && <CampaignForm key={`classify-${item.id}-${version}`} campaignId={campaignId} submitAction={inventoryAction} label={`GM effect: ${item.name}`}>
        {hidden}<input type="hidden" name="operation" value="classify" /><label>Identified effect<select name="effect" defaultValue={itemEffect(item)}><option value="manual">Manual / custom consumable</option><option value="mana-full">Standard Mana Potion</option></select></label><button type="submit">Save identified effect</button>
      </CampaignForm>}{item.gearSlot !== 'none' && baseline && <GearBonusesView campaignId={campaignId} crawlerId={crawlerId} version={version} item={item} baseline={baseline} />}</>,
    };
  }
  const addItemPanel = <CampaignForm campaignId={campaignId} submitAction={inventoryAction} label="Record an acquired item">
    <input type="hidden" name="crawlerId" value={crawlerId} /><input type="hidden" name="version" value={version} /><input type="hidden" name="operation" value="add" /><ItemFields />
    <div>Record items acquired or granted by the GM. Reviewed flat equipment bonuses apply automatically; conditional and custom effects stay in notes.</div><button type="submit" disabled={items.length >= MAX_INVENTORY_ENTRIES}>Add to inventory</button>
  </CampaignForm>;
  return <InventorySystem key={crawlerId} initialItems={presentation.items} equipmentSlots={presentation.equipmentSlots} itemActions={itemActions} addItemPanel={addItemPanel} summary={`${items.length}/${MAX_INVENTORY_ENTRIES} entries · ${presentation.accessoryCount}/10 accessories equipped`} />;
}
