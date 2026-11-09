import { CampaignForm } from '@/components/campaign-form';
import { inventoryAction } from '@/app/campaign/inventory-actions';
import { equipmentLocations, GEAR_SLOTS, ITEM_KINDS, MAX_INVENTORY_ENTRIES, MAX_ITEM_QUANTITY, itemEffect, type InventoryItem } from '@/domain/inventory';
import styles from '@/styles/campaign.module.css';

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
export function InventoryView({ campaignId, crawlerId, version, items, isGm, mana, maxMana, healthSlots }: {
  campaignId: string; crawlerId: string; version: string; items: readonly InventoryItem[]; isGm: boolean;
  mana?: number; maxMana?: number; healthSlots?: number;
}) {
  const hidden = <><input type="hidden" name="crawlerId" value={crawlerId} /><input type="hidden" name="version" value={version} /></>;
  const accessories = items.filter((item) => ['accessory', 'belt', 'cape'].includes(item.location)).length;
  return <section aria-label="Inventory and equipment" className={styles.inventory}>
    <h3>Inventory and equipment</h3>
    <p>{items.length}/{MAX_INVENTORY_ENTRIES} entries · Accessories equipped: {accessories}/10</p>
    <p>{isGm ? 'You can manage this crawler’s inventory as GM.' : 'Manage items for this game crawler.'} Saved account writeups and other games are unchanged.</p>
    <p>Equipping uses one of the entry’s quantity. Equipment bonuses and custom effects remain manual. Identified Standard Mana Potions restore Mana and spend one item together.</p>
    {items.length === 0 ? <p>No structured items yet. Starting gear notes below are preserved; add the items you still have.</p> : <ul className={styles.inventoryList}>
      {items.map((item) => <li key={item.id} className={styles.inventoryItem}>
        <div className={styles.heading}><h4>{item.name} × {item.quantity}</h4><span>{label(item.kind)} · {item.location === 'stored' ? 'Stored' : `One equipped: ${label(item.location)}`}</span></div>
        {item.notes && <p className={styles.notes}>{item.notes}</p>}
        <details><summary>Manage {item.name}</summary>
          <CampaignForm key={`edit-${item.id}-${version}`} campaignId={campaignId} submitAction={inventoryAction} label={`Edit ${item.name}`}>
            {hidden}<input type="hidden" name="operation" value="edit" /><input type="hidden" name="itemId" value={item.id} />
            <ItemFields item={item} /><button type="submit">Save item</button>
          </CampaignForm>
          {item.gearSlot !== 'none' && <CampaignForm key={`equip-${item.id}-${version}`} campaignId={campaignId} submitAction={inventoryAction} label={`Equip or store ${item.name}`}>
            {hidden}<input type="hidden" name="operation" value="equip" /><input type="hidden" name="itemId" value={item.id} />
            <label>Location<select name="location" defaultValue={item.location}>{equipmentLocations(item.gearSlot).map((location) => <option key={location} value={location}>{label(location)}</option>)}</select></label>
            <p>Occupied slots are rejected. Store the other item first. Gloves and held items use separate slots; two-handed items occupy both hands.</p><button type="submit">Save equipment</button>
          </CampaignForm>}
          {item.kind === 'consumable' && itemEffect(item) === 'manual' && <CampaignForm key={`use-${item.id}-${version}`} campaignId={campaignId} submitAction={inventoryAction} label={`Use one ${item.name}`}>
            {hidden}<input type="hidden" name="operation" value="consume" /><input type="hidden" name="itemId" value={item.id} />
            <p>This removes one item only. Apply its effect separately using the health or Mana controls. The last item removes this entry.</p>
            <p>Potions in combat: confirm Action/Interrupt timing and the every-other-round limit with the GM. Hotlist access, Potion Sickness, and effects are not automated.</p>
            <label><input type="checkbox" name="confirmed" value="yes" required /> Confirm use and resolve the effect at the table.</label><button type="submit">Use one item</button>
          </CampaignForm>}
          {itemEffect(item) === 'mana-full' && <CampaignForm key={`potion-${item.id}-${version}`} campaignId={campaignId} submitAction={inventoryAction} label={`Drink ${item.name}`}>
            {hidden}<input type="hidden" name="operation" value="drink-mana" /><input type="hidden" name="itemId" value={item.id} />
            <p>Spends one potion and restores all Mana in a single save. Full Mana or Dying blocks use without spending an item.</p>
            <label><input type="checkbox" name="confirmed" value="yes" required /> The crawler is conscious, able to drink, and the Action/Interrupt and every-other-round potion limit are satisfied.</label>
            <button type="submit" disabled={healthSlots === undefined || healthSlots === 0 || mana === undefined || maxMana === undefined || mana >= maxMana}>Drink one · restore all Mana</button>
          </CampaignForm>}
          {isGm && item.kind === 'consumable' && <CampaignForm key={`classify-${item.id}-${version}`} campaignId={campaignId} submitAction={inventoryAction} label={`GM item effect: ${item.name}`}>
            {hidden}<input type="hidden" name="operation" value="classify" /><input type="hidden" name="itemId" value={item.id} />
            <label>Identified effect<select name="effect" defaultValue={itemEffect(item)}><option value="manual">Manual / custom consumable</option><option value="mana-full">Standard Mana Potion · restore all Mana</option></select></label>
            <p>Use this to identify an existing Mana potion. Names and notes alone never activate automation. Classification does not restore Mana or change quantity.</p><button type="submit">Save identified effect</button>
          </CampaignForm>}
          <CampaignForm key={`remove-${item.id}-${version}`} campaignId={campaignId} submitAction={inventoryAction} label={`Remove ${item.name}`}>
            {hidden}<input type="hidden" name="operation" value="remove" /><input type="hidden" name="itemId" value={item.id} />
            <label><input type="checkbox" name="confirmed" value="yes" required /> Remove this entire entry ({item.quantity} items). This is not a transfer to another crawler.</label><button type="submit" className={styles.danger}>Remove entry</button>
          </CampaignForm>
        </details>
      </li>)}
    </ul>}
    <details><summary>Add an item</summary>
      <CampaignForm campaignId={campaignId} submitAction={inventoryAction} label="Record an acquired item">
        {hidden}<input type="hidden" name="operation" value="add" /><ItemFields />
        <p>Record items granted or acquired in play with the GM. This adds one separate entry; it does not purchase, award loot, or merge stacks automatically.</p>
        <button type="submit" disabled={items.length >= MAX_INVENTORY_ENTRIES}>Add to inventory</button>
      </CampaignForm>
    </details>
  </section>;
}
