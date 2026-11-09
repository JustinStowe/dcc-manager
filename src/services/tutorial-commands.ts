import { getCampaignRole } from '@/domain';
import { createTutorialProfile, castTutorialHeal, damageTutorialSlots, restoreTutorialProfile, type Scores, type TutorialDraft, type TutorialProfile, type TutorialStats } from '@/domain/tutorial';
import { requireUuid, type CampaignWorkspace } from './campaign-workspace';

export interface TutorialRoll { readonly id: string; readonly scores: Scores }
export interface TutorialPort {
  create(input: { campaignId: string; ownerId: string; name: string; profile: TutorialProfile; rollId: string | null; convertId: string | null; version: string | null; slots: number }): Promise<void>;
  act(input: { crawlerId: string; version: string; operation: string; amount: number; stats: TutorialStats | null; number: number | null }): Promise<void>;
}
function text(form: FormData, name: string): string {
  const value = form.get(name);
  if (typeof value !== 'string' || !value.trim()) throw new RangeError(`Enter ${name}.`);
  return value.trim();
}
function number(form: FormData, name: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const result = Number(text(form, name));
  if (!Number.isSafeInteger(result) || result < min || result > max) throw new RangeError(`Enter a whole-number ${name} from ${min} to ${max}.`);
  return result;
}
export async function executeTutorialCommand(workspace: CampaignWorkspace, form: FormData, port: TutorialPort): Promise<string> {
  const { campaign, userId } = workspace;
  if (!campaign) throw new Error('Join a game first.');
  const role = getCampaignRole(campaign, userId);
  if (!role) throw new Error('Campaign membership is required.');
  const operation = text(form, 'operation').replace(/^tutorial-/, '');
  if (operation === 'create' || operation === 'convert') {
    const ownerId = requireUuid(text(form, 'ownerUserId'));
    if (role !== 'gm' && ownerId !== userId) throw new Error('You can create only your own crawler.');
    if (ownerId !== campaign.gmUserId && !campaign.playerUserIds.includes(ownerId)) throw new Error('The owner must belong to this game.');
    const profile = createTutorialProfile(JSON.parse(text(form, 'draft')) as TutorialDraft);
    const name = text(form, 'name');
    if (name.length > 200) throw new RangeError('Use at most 200 characters for the name.');
    const convertId = operation === 'convert' ? requireUuid(text(form, 'crawlerId')) : null;
    const version = convertId ? requireUuid(text(form, 'version')) : null;
    let slots = 10;
    if (convertId) {
      if (role !== 'gm' || form.get('reviewed') !== 'yes') throw new Error('The GM must review and confirm conversion.');
      const previous = campaign.crawlers.find((entry) => entry.crawler.id === convertId && entry.ownerUserId === ownerId);
      if (!previous || previous.crawler.ruleset === 'tutorial-v1' || workspace.versions[convertId] !== version) throw new Error('Prototype changed. Refresh before converting.');
      slots = number(form, 'remainingSlots', 0, 10);
      if (previous.crawler.currentSegments === 0 && slots !== 0) throw new RangeError('Zero health must remain zero during conversion.');
    } else if (campaign.crawlers.some((entry) => entry.ownerUserId === ownerId)) throw new Error('This account already has a crawler in this game.');
    const rawRoll = form.get('rollId');
    const rollId = typeof rawRoll === 'string' && rawRoll ? requireUuid(rawRoll) : null;
    if (profile.method === 'rolled' && !rollId) throw new Error('Roll or recover your stats on the server first.');
    await port.create({ campaignId: campaign.id, ownerId, name, profile, rollId, convertId, version, slots });
    return convertId ? 'Prototype converted after GM review.' : 'Level 1 Human crawler created.';
  }
  const crawlerId = requireUuid(text(form, 'crawlerId'));
  const version = requireUuid(text(form, 'version'));
  const entry = campaign.crawlers.find((item) => item.crawler.id === crawlerId);
  const record = workspace.tutorials?.[crawlerId];
  if (!entry || !record || (role !== 'gm' && entry.ownerUserId !== userId)) throw new Error('Tutorial crawler access is required.');
  if (workspace.versions[crawlerId] !== version) throw new Error('Crawler changed. Refresh before trying again.');
  let amount = 0;
  let stats: TutorialStats | null = null;
  let crawlerNumber: number | null = null;
  let notice = 'Change saved.';
  if (['damage', 'heal-slots', 'mana-spend', 'mana-recover', 'favor-award'].includes(operation)) amount = number(form, 'amount', 1);
  switch (operation) {
    case 'damage': {
      const after = damageTutorialSlots(entry.crawler.currentSegments, record.profile.stats.constitution.enhanced, amount);
      notice = `${entry.crawler.currentSegments - after} health slots lost. Unused damage is discarded.`; break;
    }
    case 'heal-slots': break;
    case 'cast-heal': castTutorialHeal(entry.crawler.currentSegments, record.profile); break;
    case 'mana-spend': if (amount > record.profile.mana) throw new RangeError('Not enough Mana.'); break;
    case 'mana-recover': break;
    case 'favor-spend': if (record.profile.favor < 1) throw new RangeError('No AI Favor available.'); break;
    case 'favor-award': if (role !== 'gm') throw new Error('Only the GM can award AI Favor.'); break;
    case 'stats':
      if (role !== 'gm') throw new Error('Only the GM can edit existing stats.');
      stats = JSON.parse(text(form, 'stats')) as TutorialStats;
      restoreTutorialProfile({ ...record.profile, stats, mana: Math.min(record.profile.mana, stats.intelligence.enhanced) });
      notice = 'Stats saved. Health slots were preserved; Mana was clamped to its maximum.'; break;
    case 'number':
      if (role !== 'gm') throw new Error('Only the GM can edit Crawler Numbers.');
      crawlerNumber = number(form, 'crawlerNumber', 1, 2147483647); break;
    default: throw new RangeError('Unknown tutorial action.');
  }
  await port.act({ crawlerId, version, operation, amount, stats, number: crawlerNumber });
  return notice;
}
