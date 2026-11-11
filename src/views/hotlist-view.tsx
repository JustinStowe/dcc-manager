import { QuickSlots } from '@/components/quick-slots';
import { CampaignForm } from '@/components/campaign-form';
import { loadoutAction } from '@/app/campaign/loadout-actions';
import { hotlistSkills, type Hotlist } from '@/domain/loadout';
import { itemEffect, type InventoryItem } from '@/domain/inventory';
import type { TutorialProfile } from '@/domain/tutorial';
import styles from '@/styles/campaign.module.css';

export function HotlistView({ campaignId, crawlerId, version, hotlist, inventory, profile, healthSlots }: {
  campaignId: string; crawlerId: string; version: string; hotlist: Hotlist; inventory: readonly InventoryItem[]; profile: TutorialProfile; healthSlots: number;
}) {
  const skills = hotlistSkills(profile);
  const slots = hotlist.map((entry, index) => {
    const number = index + 1;
    const item = entry?.kind === 'item' ? inventory.find((candidate) => candidate.id === entry.target) : undefined;
    const skill = entry?.kind === 'skill' ? skills.find((candidate) => candidate.id === entry.target) : undefined;
    const name = item?.name ?? skill?.name ?? 'Empty';
    const hidden = <><input type="hidden" name="crawlerId" value={crawlerId} /><input type="hidden" name="version" value={version} /><input type="hidden" name="slot" value={number} /></>;
    const controls = <div className={styles.controlGrid}>
      {((item?.kind === 'consumable') || skill?.automated) && <CampaignForm key={`use-${number}-${version}`} campaignId={campaignId} submitAction={loadoutAction} label={`Use prepared ${name}`}>
        {hidden}<input type="hidden" name="operation" value="use" />
        <div>{skill ? 'Heal: spend 2 Mana and restore 2 health slots atomically.' : item && itemEffect(item) === 'mana-full' ? 'Use one Standard Mana Potion and fully restore Mana atomically.' : 'Use one item; custom effects remain manual.'}</div>
        <label><input type="checkbox" name="confirmed" value="yes" required /> Conscious, HUD accessible, and Action/Interrupt and potion timing are valid.</label>
        <button type="submit" disabled={healthSlots === 0 || (skill?.id === 'heal' && profile.mana < 2) || (item?.effect === 'mana-full' && profile.mana >= profile.stats.intelligence.enhanced)}>Use prepared action</button>
      </CampaignForm>}
      {item && ['holding', 'two-hands'].includes(item.gearSlot) && <CampaignForm key={`ready-${number}-${version}`} campaignId={campaignId} submitAction={loadoutAction} label={`Ready ${name}`}>
        {hidden}<input type="hidden" name="operation" value="ready" /><label>Holding slot<select name="location" defaultValue={item.gearSlot === 'two-hands' ? 'two-hands' : 'main-hand'}>{item.gearSlot === 'two-hands' ? <option value="two-hands">Both hands</option> : <><option value="main-hand">Main hand</option><option value="off-hand">Off hand</option></>}</select></label>
        <div>Readies one copy and stores conflicting held gear in the same save. Gloves stay equipped. A weapon swap is free as part of an Attack; other timing is adjudicated at the table.</div>
        <label><input type="checkbox" name="confirmed" value="yes" required /> HUD access and Action/Attack timing confirmed.</label><button type="submit" disabled={healthSlots === 0}>Ready / swap held item</button>
      </CampaignForm>}
      {skill && !skill.automated && <div>Prepared Attack Spell. Resolve its Check, Mana cost, and effect at the table using the tracker; attack execution is not automated.</div>}
      {item && item.kind !== 'consumable' && !['holding','two-hands'].includes(item.gearSlot) && <div>Prepared item reference. Its special use remains a table decision; equip worn gear through inventory.</div>}
      <CampaignForm key={`assign-${number}-${version}`} campaignId={campaignId} submitAction={loadoutAction} label={`Prepare slot ${number}`}>
        {hidden}<input type="hidden" name="operation" value="assign" /><label>Item stack or known Spell<select name="target" required defaultValue=""><option value="" disabled>Choose an item or Spell</option>{inventory.map((candidate) => <option key={candidate.id} value={`item:${candidate.id}`}>{candidate.name} × {candidate.quantity}</option>)}{skills.map((candidate) => <option key={candidate.id} value={`skill:${candidate.id}`}>{candidate.name}</option>)}</select></label>
        <div>Replaces this slot&apos;s reference only. If already prepared elsewhere, it moves here. Inventory quantities are unchanged. Retrieval/preparation in combat takes the appropriate Action.</div><button type="submit" disabled={healthSlots === 0}>Assign / replace slot</button>
      </CampaignForm>
      {entry && <CampaignForm key={`clear-${number}-${version}`} campaignId={campaignId} submitAction={loadoutAction} label={`Clear slot ${number}`}>{hidden}<input type="hidden" name="operation" value="clear" /><div>Remove the quick reference; keep the item or Spell.</div><button type="submit" disabled={healthSlots === 0}>Clear slot</button></CampaignForm>}
    </div>;
    return { number, name, detail: item ? `${item.quantity} in stack` : skill ? 'Spell' : 'Assign an item or Spell', controls };
  });
  return <QuickSlots slots={slots} />;
}
