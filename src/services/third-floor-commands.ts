import { getCampaignRole } from '@/domain';
import { advancementReason } from '@/domain/advancement';
import { applySelection, object, offerSelections, reconcileSelection, restoreThirdFloor, shortText } from '@/domain/third-floor';
import { derivedBaseline } from '@/domain/sheet';
import { loadoutTotals } from '@/domain/loadout';
import { STAT_KEYS, type Scores } from '@/domain/tutorial';
import { requireUuid, type CampaignWorkspace } from './campaign-workspace';
export interface ThirdFloorWrite { readonly crawlerId: string; readonly version: string; readonly operation: string; readonly payload: Record<string, unknown> }
export interface ThirdFloorPort { act(input: ThirdFloorWrite): Promise<void> }
function text(form: FormData, key: string) { return shortText(form.get(key), 100000); }
export async function executeThirdFloorCommand(workspace: CampaignWorkspace, form: FormData, port: ThirdFloorPort): Promise<string> {
  const crawlerId = requireUuid(text(form, 'crawlerId')), version = requireUuid(text(form, 'version'));
  const campaign = workspace.campaign, role = campaign ? getCampaignRole(campaign, workspace.userId) : null;
  const entry = campaign?.crawlers.find(row => row.crawler.id === crawlerId);
  if (!entry || !role || (role !== 'gm' && entry.ownerUserId !== workspace.userId)) throw new Error('Crawler access denied.');
  if (workspace.versions[crawlerId] !== version) throw new Error('Crawler changed. Close selection, refresh, then reopen it.');
  const sheet = workspace.sheets?.[crawlerId], loadout = workspace.loadouts?.[crawlerId], skills = workspace.skills?.[crawlerId], items = workspace.inventories?.[crawlerId];
  if (entry.crawler.ruleset !== 'tutorial-v1' || !sheet || !loadout || !skills || !items) throw new Error('Official crawler data unavailable.');
  const state = restoreThirdFloor(sheet.thirdFloor), operation = text(form, 'operation');
  if (operation !== 'select' && role !== 'gm') throw new Error('Only the GM reviews benefits and offers choices.');
  if (!sheet.advancement?.reconciled) throw new Error('Reconcile level advancement before Race/Class selection.');
  const input = object(JSON.parse(text(form, 'payload'))), reason = advancementReason(input.reason);
  const bases = Object.fromEntries(STAT_KEYS.map(key => [key, loadout.baseline[key].base])) as Scores;
  let payload: Record<string, unknown>;
  if (input.confirmed !== true) throw new RangeError('Confirm the benefit review and table requirements.');
  if (operation === 'review') {
    const next = reconcileSelection(state, sheet.floor, sheet.advancement.humanFavor, input);
    payload = next.selected ? { mode: 'existing', raceId: next.selected.raceId, classId: next.selected.classId, raceName: next.selected.raceName, className: next.selected.className, size: next.selected.size, move: next.selected.move, step: next.selected.step, confirmed: true, reason } : { mode: 'none', confirmed: true, reason };
  } else if (operation === 'offer') {
    const next = offerSelections(state, sheet.floor, input.offers, skills, bases);
    payload = { offers: next.offers, confirmed: true, reason };
  } else if (operation === 'select') {
    const key = shortText(input.pair), result = applySelection(state, sheet.floor, key, input.choices, bases, skills, loadout.defenseBase, sheet.baseDefenses ?? {}, reason);
    loadoutTotals(derivedBaseline(result.bases, sheet.effects), items, result.defenseBase);
    payload = { pair: key, choices: result.choices, confirmed: true, reason };
  } else throw new RangeError('Unknown Race/Class action.');
  await port.act({ crawlerId, version, operation, payload });
  return 'Race/Class selection saved.';
}
