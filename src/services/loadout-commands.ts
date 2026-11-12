import { getCampaignRole } from '@/domain';
import { itemEffect, validateInventory } from '@/domain/inventory';
import { castTutorialHeal } from '@/domain/tutorial';
import { drinkStandardManaPotion } from '@/domain/potions';
import { assignHotlist, bounded, damageAfterDr, loadoutTotals, readyHotlistItem, restoreBaseline, restoreBonuses, restoreHotlist, type GearBonuses, type HotlistEntry } from '@/domain/loadout';
import { requireUuid, type CampaignWorkspace } from './campaign-workspace';
import { castLearnedSpell } from '@/domain/abilities';
import type { TutorialStats } from '@/domain/tutorial';

export interface LoadoutWrite {
  readonly crawlerId: string; readonly version: string;
  readonly operation: 'assign' | 'clear' | 'use' | 'ready' | 'bonuses' | 'defense' | 'damage-dr';
  readonly slot: number | null; readonly kind: string | null; readonly target: string | null; readonly location: string | null;
  readonly bonuses: GearBonuses | null; readonly baseline: TutorialStats | null; readonly amount: number;
}
export interface LoadoutPort { act(input: LoadoutWrite): Promise<void> }
function text(form: FormData, key: string): string {
  const value = form.get(key); if (typeof value !== 'string' || !value.trim()) throw new RangeError(`Enter ${key}.`); return value.trim();
}
export async function executeLoadoutCommand(workspace: CampaignWorkspace, form: FormData, port: LoadoutPort): Promise<string> {
  const campaign = workspace.campaign;
  if (!campaign) throw new Error('This game is no longer available. Return to the lobby.');
  const crawlerId = requireUuid(text(form, 'crawlerId')), version = requireUuid(text(form, 'version'));
  const entry = campaign.crawlers.find((candidate) => candidate.crawler.id === crawlerId);
  const role = getCampaignRole(campaign, workspace.userId);
  if (!entry || !role || (role !== 'gm' && entry.ownerUserId !== workspace.userId)) throw new Error('You do not have access to this loadout.');
  if (entry.crawler.ruleset !== 'tutorial-v1') throw new Error('The GM must convert this prototype first.');
  const loadout = workspace.loadouts?.[crawlerId], profile = workspace.tutorials?.[crawlerId]?.profile, items = workspace.inventories?.[crawlerId];
  if (!loadout || !profile || !items) throw new Error('Loadout could not be loaded. Refresh the campaign.');
  if (workspace.versions[crawlerId] !== version) throw new Error('Crawler changed. Refresh the campaign.');
  const operation = text(form, 'operation') as LoadoutWrite['operation'];
  if (!['assign', 'clear', 'use', 'ready', 'bonuses', 'defense', 'damage-dr'].includes(operation)) throw new RangeError('Unknown loadout action.');
  let slot: number | null = null, kind: string | null = null, target: string | null = null, location: string | null = null;
  let bonuses: GearBonuses | null = null, baseline: TutorialStats | null = null, amount = 0;
  let notice = 'Loadout saved.';
  if (['assign', 'clear', 'use', 'ready'].includes(operation)) slot = bounded(Number(text(form, 'slot')), 1, 10);
  if (slot !== null && entry.crawler.currentSegments === 0) throw new RangeError('A Dying crawler cannot use their HUD.');
  if (operation === 'assign') {
    const parts = text(form, 'target').split(':'); kind = parts[0]; target = parts[1];
    if (parts.length !== 2 || (kind !== 'item' && kind !== 'skill')) throw new RangeError('Choose an item or known Spell.');
    if (kind === 'item') target = requireUuid(target);
    restoreHotlist(assignHotlist(loadout.hotlist, slot!, { kind, target } as HotlistEntry), items, profile, workspace.skills?.[crawlerId]);
  } else if (operation === 'use' || operation === 'ready') {
    if (form.get('confirmed') !== 'yes') throw new RangeError('Confirm HUD access and Action/potion timing with the GM.');
    if (entry.crawler.currentSegments === 0) throw new RangeError('A Dying crawler cannot use their HUD.');
    const prepared = loadout.hotlist[slot! - 1];
    if (!prepared) throw new RangeError('This Hotlist slot is empty.');
    if (operation === 'ready') {
      if (prepared.kind !== 'item') throw new RangeError('Choose a prepared held item.');
      location = text(form, 'location'); validateInventory(readyHotlistItem(items, prepared.target, location));
    } else if (prepared.kind === 'skill') {
      const known = workspace.skills?.[crawlerId]?.find((ability) => ability.id === prepared.target);
      if (known) { castLearnedSpell(known, profile, entry.crawler.currentSegments, true); notice = known.automation === 'tutorial-heal' ? 'Prepared Heal applied: 2 Mana spent and up to 2 health slots restored.' : 'Prepared Spell Mana cost recorded. Resolve its Check and effects at the table.'; }
      else { if (prepared.target !== 'heal') throw new RangeError('Resolve this Spell at the table.'); castTutorialHeal(entry.crawler.currentSegments, profile); notice = 'Prepared Heal applied: 2 Mana spent and up to 2 health slots restored.'; }
    } else {
      const item = items.find((candidate) => candidate.id === prepared.target);
      if (!item || item.kind !== 'consumable') throw new RangeError('Use Ready for held equipment; other item effects remain manual.');
      if (itemEffect(item) === 'mana-full') {
        drinkStandardManaPotion(items, profile, entry.crawler.currentSegments, item.id);
        notice = 'One prepared Mana Potion spent and Mana fully restored.';
      } else notice = 'One prepared item spent. Resolve its custom effect at the table.';
    }
  } else if (operation === 'bonuses') {
    if (role !== 'gm') throw new Error('Only the GM defines equipment bonuses.');
    if (form.get('reviewed') !== 'yes') throw new RangeError('Review the baseline and bonus together to avoid double counting.');
    target = requireUuid(text(form, 'itemId'));
    if (!items.some((item) => item.id === target)) throw new RangeError('Item unavailable.');
    bonuses = restoreBonuses(Object.fromEntries(['strength','intelligence','constitution','dexterity','charisma','dr','evade'].map((key) => [key, Number(text(form, `bonus-${key}`))])));
    baseline = restoreBaseline(JSON.parse(text(form, 'stats')));
    const changed = validateInventory(items.map((item) => item.id === target ? { ...item, bonuses: bonuses! } : item));
    loadoutTotals(baseline, changed, loadout.defenseBase);
  } else if (operation === 'defense') {
    if (role !== 'gm') throw new Error('Only the GM sets non-gear DR.');
    amount = bounded(Number(text(form, 'amount')), 0, 10000);
  } else if (operation === 'damage-dr') {
    amount = bounded(Number(text(form, 'amount')), 1, Number.MAX_SAFE_INTEGER);
    const dr = loadoutTotals(loadout.baseline, items, loadout.defenseBase).dr;
    const after = damageAfterDr(entry.crawler.currentSegments, profile.stats.constitution.enhanced, amount, dr);
    notice = `${entry.crawler.currentSegments - after} health slots lost after ${dr} DR. Leftover damage discarded.`;
  }
  await port.act({ crawlerId, version, operation, slot, kind, target, location, bonuses, baseline, amount });
  return notice;
}
