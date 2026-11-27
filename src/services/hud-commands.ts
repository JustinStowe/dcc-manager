import { getCampaignRole, type Campaign } from '@/domain';
import { hudCommandSchema, type HudCommand, type HudSnapshot } from '@/domain/hud';
import { requireUuid } from './campaign-workspace';

export interface HudPort {
  snapshot(campaignId: string, floor: number, before?: string): Promise<HudSnapshot>;
  act(campaignId: string, command: HudCommand): Promise<void>;
}
export async function executeHudCommand(campaign: Campaign, userId: string, input: unknown, port: HudPort) {
  requireUuid(campaign.id);
  const role = getCampaignRole(campaign, userId);
  if (!role) throw new Error('Game access denied.');
  const command = hudCommandSchema.parse(input);
  if (!['read', 'read-all'].includes(command.operation) && role !== 'gm') throw new Error('Only the GM can broadcast alerts or control floor timers.');
  if (command.operation === 'broadcast' && command.crawlerId && !campaign.crawlers.some(e => e.crawler.id === command.crawlerId)) throw new Error('Choose a crawler in this game.');
  await port.act(campaign.id, command);
  return command;
}
