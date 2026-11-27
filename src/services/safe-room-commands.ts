import { getCampaignRole } from '@/domain';
import { safeRoomCommandSchema, type SafeRoomCommand, type SafeRoomQuery, type SafeRoomSnapshot } from '@/domain/safe-room';
import { requireUuid, type CampaignWorkspace } from './campaign-workspace';
export interface SafeRoomPort {
  snapshot(crawlerId: string, query: SafeRoomQuery): Promise<SafeRoomSnapshot>;
  act(crawlerId: string, command: SafeRoomCommand): Promise<void>;
}
export interface SaferoomStatusPort { setSaferoom(campaignId: string, crawlerIds: readonly string[], allowed: boolean): Promise<void> }
export async function executeSaferoomStatusCommand(workspace: CampaignWorkspace, form: FormData, port: SaferoomStatusPort): Promise<string> {
  const campaign = workspace.campaign;
  if (!campaign || getCampaignRole(campaign, workspace.userId) !== 'gm') throw new Error('Only the GM can change saferoom status.');
  const allowed = form.get('allowed');
  if (allowed !== 'true' && allowed !== 'false') throw new RangeError('Choose to open or close the saferoom.');
  const ids = [...new Set(form.getAll('crawlerId').map(value => requireUuid(String(value))))];
  if (!ids.length) throw new RangeError('Select one or more crawlers.');
  if (ids.some(id => campaign.crawlers.find(entry => entry.crawler.id === id)?.crawler.ruleset !== 'tutorial-v1')) throw new Error('Choose official crawlers from this game.');
  await port.setSaferoom(campaign.id, ids, allowed === 'true');
  return allowed === 'true'
    ? `Saferoom open for ${ids.length} crawler(s). They can open boxes and, on Floor 3+, spend pending stat points.`
    : `Saferoom closed for ${ids.length} crawler(s).`;
}
export async function executeSafeRoomCommand(workspace: CampaignWorkspace, crawlerId: string, input: unknown, port: SafeRoomPort) {
  const campaign = workspace.campaign, role = campaign ? getCampaignRole(campaign, workspace.userId) : null;
  const entry = campaign?.crawlers.find(e => e.crawler.id === crawlerId);
  if (!role || !entry || role !== 'gm' && entry.ownerUserId !== workspace.userId) throw new Error('Crawler access denied.');
  if (entry.crawler.ruleset !== 'tutorial-v1') throw new Error('The GM must review this prototype before using Safe Room rewards.');
  const command = safeRoomCommandSchema.parse(input);
  if (['award', 'access', 'unlock', 'reconcile-incentive'].includes(command.operation) && role !== 'gm') throw new Error('Only the GM can award rewards, confirm saferoom access or release a vote lock.');
  await port.act(crawlerId, command);
  return command;
}
