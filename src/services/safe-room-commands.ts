import { getCampaignRole } from '@/domain';
import { safeRoomCommandSchema, type SafeRoomCommand, type SafeRoomQuery, type SafeRoomSnapshot } from '@/domain/safe-room';
import type { CampaignWorkspace } from './campaign-workspace';
export interface SafeRoomPort {
  snapshot(crawlerId: string, query: SafeRoomQuery): Promise<SafeRoomSnapshot>;
  act(crawlerId: string, command: SafeRoomCommand): Promise<void>;
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
