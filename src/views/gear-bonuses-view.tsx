import { CampaignForm } from '@/components/campaign-form';
import { loadoutAction } from '@/app/campaign/loadout-actions';
import { restoreBonuses, ZERO_BONUSES, type GearBonuses } from '@/domain/loadout';
import type { InventoryItem } from '@/domain/inventory';
import type { TutorialStats } from '@/domain/tutorial';

export function GearBonusesView({ campaignId, crawlerId, version, item, baseline }: { campaignId: string; crawlerId: string; version: string; item: InventoryItem; baseline: TutorialStats }) {
  const current = restoreBonuses(item.bonuses);
  return <CampaignForm key={`bonuses-${item.id}-${version}`} campaignId={campaignId} submitAction={loadoutAction} label={`GM equipment bonuses: ${item.name}`}>
    <input type="hidden" name="crawlerId" value={crawlerId} /><input type="hidden" name="version" value={version} /><input type="hidden" name="operation" value="bonuses" /><input type="hidden" name="itemId" value={item.id} />
    <div>Unconditional flat bonuses only. Stat values add to Enhanced scores; DR and Evade add to their totals. Stored gear grants nothing; a quantity equips only one copy. Conditional abilities and special effects stay in notes.</div>
    {Object.keys(ZERO_BONUSES).map((key) => <label key={key}>{key === 'dr' ? 'Damage resistance' : key === 'evade' ? 'Flat Evade bonus' : `Enhanced ${key} points`}<input type="number" name={`bonus-${key}`} min={0} max={1000} step={1} required defaultValue={current[key as keyof GearBonuses]} /></label>)}
    <input type="hidden" name="stats" value={JSON.stringify(baseline)} />
    <p>Enhanced stats are calculated from Unenhanced stats, active modifiers, and equipped gear. Edit Unenhanced stats on the sheet; manage non-gear modifiers separately.</p>
    <label><input type="checkbox" name="reviewed" value="yes" required /> This equipment bonus is not also recorded as an active non-gear modifier.</label><button type="submit">Save reviewed equipment definition</button>
  </CampaignForm>;
}
