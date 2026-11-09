import { cookies } from 'next/headers';
import { restoreCrawler, getCampaignRole, type Campaign } from '@/domain';
import type { CampaignWorkspace, CampaignWritePort } from '@/services/campaign-workspace';
import { requireUuid } from '@/services/campaign-workspace';
import { createClient } from '@/utils/supabase/server';

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid campaign data.');
  return value as Record<string, unknown>;
}
function field(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new Error('Invalid campaign data.');
  return value;
}

export function campaignDatabaseError(error: { code?: string }): Error {
  if (error.code === '40001') return new Error('Crawler changed in another session. Refresh the campaign before trying again.');
  if (error.code === '23505') return new Error('That player is already a member or already has a crawler. Refresh the campaign.');
  if (error.code === '42501') return new Error('You do not have permission to perform this action.');
  if (error.code === '22023' || error.code === '23514' || error.code === '23503') return new Error('Check the values and make sure the owner is a confirmed campaign member.');
  return new Error('Could not access shared campaign storage. Check the database setup and try again.');
}

export async function loadCampaignWorkspace(userId: string, selectedCampaignId: string): Promise<CampaignWorkspace> {
  const client = createClient(await cookies());
  // RLS restricts the campaign, membership rows, and crawler rows before they
  // reach this application. No privileged service-role client is used.
  const selectedId = requireUuid(selectedCampaignId);
  const { data, error } = await client.from('dcc_campaigns').select('id,name,gm_user_id').eq('id', selectedId).maybeSingle();
  if (error) throw campaignDatabaseError(error);
  if (!data) return { userId, campaign: null, versions: {} };
  const row = record(data);
  const campaignId = requireUuid(field(row, 'id'));
  if (campaignId !== selectedId) throw new Error('Invalid selected campaign.');
  const [membersResult, crawlersResult] = await Promise.all([
    client.from('dcc_campaign_members').select('user_id').eq('campaign_id', campaignId),
    client.from('dcc_crawlers').select('id,campaign_id,owner_user_id,name,base_segments,constitution,current_segments,version').eq('campaign_id', campaignId).order('name'),
  ]);
  if (membersResult.error) throw campaignDatabaseError(membersResult.error);
  if (crawlersResult.error) throw campaignDatabaseError(crawlersResult.error);
  const versions: Record<string, string> = {};
  const campaign: Campaign = {
    id: campaignId, name: field(row, 'name'), gmUserId: requireUuid(field(row, 'gm_user_id')),
    playerUserIds: (membersResult.data ?? []).map((value: unknown) => requireUuid(field(record(value), 'user_id'))),
    crawlers: (crawlersResult.data ?? []).map((value: unknown) => {
      const item = record(value);
      const crawler = restoreCrawler({
        id: field(item, 'id'), campaignId: field(item, 'campaign_id'), name: field(item, 'name'),
        baseSegments: item.base_segments, constitution: item.constitution, currentSegments: item.current_segments,
      });
      if (crawler.campaignId !== campaignId) throw new Error('Invalid campaign crawler.');
      versions[crawler.id] = requireUuid(field(item, 'version'));
      return { ownerUserId: requireUuid(field(item, 'owner_user_id')), crawler };
    }),
  };
  const role = getCampaignRole(campaign, userId);
  if (role === null || (role === 'player' && campaign.crawlers.some((entry) => entry.ownerUserId !== userId))) {
    throw new Error('Campaign access could not be verified.');
  }
  return { userId, campaign, versions };
}

export async function createCampaignWritePort(): Promise<CampaignWritePort> {
  const client = createClient(await cookies());
  async function call(name: string, args: Record<string, string | number>) {
    const { error } = await client.rpc(name, args);
    if (error) throw campaignDatabaseError(error);
  }
  return {
    addPlayer(campaignId, userId) {
      return call('dcc_add_player', { p_campaign_id: campaignId, p_user_id: userId });
    },
    createCrawler(input) {
      return call('dcc_create_crawler', {
        p_campaign_id: input.campaignId, p_owner_user_id: input.ownerUserId, p_name: input.name,
        p_base_segments: input.baseSegments, p_constitution: input.constitution, p_current_segments: input.currentSegments,
      });
    },
    changeHealth(crawlerId, version, adjustment) {
      return call('dcc_change_health', { p_crawler_id: crawlerId, p_expected_version: version, p_adjustment: adjustment });
    },
    updateStats(crawlerId, version, baseSegments, constitution) {
      return call('dcc_update_stats', { p_crawler_id: crawlerId, p_expected_version: version, p_base_segments: baseSegments, p_constitution: constitution });
    },
  };
}
