import { getCampaignRole } from '@/domain';
import { allocatePoints, authorizePoints, awardLevels, reconcileAdvancement, restoreAdvancement, advancementReason, spendableAdvancement, AWARD_SOURCES, whole } from '@/domain/advancement';
import { derivedBaseline } from '@/domain/sheet';
import { loadoutTotals } from '@/domain/loadout';
import { STAT_KEYS, type Scores } from '@/domain/tutorial';
import { requireUuid, type CampaignWorkspace } from './campaign-workspace';

export interface AdvancementWrite { readonly crawlerId: string; readonly version: string; readonly operation: string; readonly payload: Record<string, unknown> }
export interface AdvancementPort { act(input: AdvancementWrite): Promise<void> }
function text(form: FormData, name: string): string {
  const value = form.get(name);
  if (typeof value !== 'string' || !value.trim()) throw new RangeError(`Enter ${name}.`);
  return value.trim();
}
export async function executeAdvancementCommand(workspace: CampaignWorkspace, form: FormData, port: AdvancementPort): Promise<string> {
  const crawlerId = requireUuid(text(form, 'crawlerId')), version = requireUuid(text(form, 'version'));
  const campaign = workspace.campaign, role = campaign ? getCampaignRole(campaign, workspace.userId) : null;
  const entry = campaign?.crawlers.find(row => row.crawler.id === crawlerId);
  if (!entry || !role || (role !== 'gm' && entry.ownerUserId !== workspace.userId)) throw new Error('You do not have access to this crawler.');
  if (workspace.versions[crawlerId] !== version) throw new Error('Crawler changed. Close advancement, refresh, and reopen it.');
  const sheet = workspace.sheets?.[crawlerId], loadout = workspace.loadouts?.[crawlerId];
  if (entry.crawler.ruleset !== 'tutorial-v1' || !sheet || !loadout) throw new Error('Official crawler data unavailable.');
  const state = restoreAdvancement(sheet.advancement, sheet.level);
  const operation = text(form, 'operation');
  if (operation !== 'allocate' && role !== 'gm') throw new Error('Only the GM manages level awards and eligibility.');
  const raw: unknown = JSON.parse(text(form, 'payload'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new RangeError('Invalid advancement change.');
  const input = raw as Record<string, unknown>;
  let payload: Record<string, unknown>;
  if (operation === 'reconcile') {
    const level = whole(input.level, 1, 250), spent = whole(input.spent, 0, 747);
    reconcileAdvancement(state, level, spent, input.confirmed === true);
    payload = { level, spent, confirmed: true, reason: advancementReason(input.reason) };
  } else if (operation === 'award') {
    const amount = whole(input.amount, 1, 249);
    const award = awardLevels(sheet.level, state, amount, sheet.floor);
    const favor = workspace.tutorials?.[crawlerId]?.profile.favor;
    if (favor === undefined) throw new Error('Crawler resources unavailable.');
    whole(favor + award.favor, 0, 2147483647);
    if (!AWARD_SOURCES.includes(input.source as typeof AWARD_SOURCES[number])) throw new RangeError('Choose an award source.');
    payload = { amount, source: input.source, reason: advancementReason(input.reason) };
  } else if (operation === 'authorize') {
    const amount = whole(input.amount, 0, 747);
    authorizePoints(sheet.level, state, sheet.floor, amount, input.saferoom === true);
    payload = { amount, saferoom: input.saferoom === true, reason: advancementReason(input.reason) };
  } else if (operation === 'human-benefit') {
    throw new RangeError('Use Third Floor Race/Class selection to confirm Human benefits.');
  } else if (operation === 'allocate') {
    const bases = Object.fromEntries(STAT_KEYS.map(key => [key, loadout.baseline[key].base])) as Scores;
    const result = allocatePoints(sheet.level, spendableAdvancement(sheet.level, state, sheet.floor, sheet.saferoom === true), sheet.floor, input.allocation, bases);
    const items = workspace.inventories?.[crawlerId];
    if (!items) throw new Error('Inventory unavailable.');
    loadoutTotals(derivedBaseline(result.bases, sheet.effects), items, loadout.defenseBase);
    payload = { allocation: result.allocation };
  } else throw new RangeError('Unknown advancement action.');
  await port.act({ crawlerId, version, operation, payload });
  return operation === 'allocate' ? 'Stat points applied.' : 'Advancement saved.';
}
