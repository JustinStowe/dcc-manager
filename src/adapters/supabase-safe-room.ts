import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { safeRoomSnapshotSchema } from '@/domain/safe-room';
import type { SafeRoomPort, SaferoomStatusPort } from '@/services/safe-room-commands';
import { campaignDatabaseError } from './supabase-campaign-repository';
function safeRoomError(error: { code?: string }) {
  if (error.code === '40001') return new Error('This crawler or reward changed. Refresh the Safe Room and try again.');
  if (error.code === '22023') return new Error('Check saferoom access, vote locks, reward review and item values. The Earth incentive requires its single reviewed decision.');
  if (error.code === '23505') return new Error('That reward has already been recorded. Refresh the Safe Room.');
  if (error.code === '54000') return new Error('Inventory is full. Make room or claim fewer items; nothing from this attempt was granted.');
  return campaignDatabaseError(error);
}
export async function createSafeRoomPort(): Promise<SafeRoomPort> {
  const client = createClient(await cookies());
  return {
    async snapshot(crawlerId, query) { const { data, error } = await client.rpc('dcc_safe_room_snapshot', { p_crawler_id: crawlerId, p_query: query }); if (error) throw safeRoomError(error); return safeRoomSnapshotSchema.parse(data); },
    async act(crawlerId, command) { const { operation, ...payload } = command; const { error } = await client.rpc('dcc_safe_room_action', { p_crawler_id: crawlerId, p_operation: operation, p_payload: payload }); if (error) throw safeRoomError(error); },
  };
}
export async function createSaferoomStatusPort(): Promise<SaferoomStatusPort> {
  const client = createClient(await cookies());
  return {
    async setSaferoom(campaignId, crawlerIds, allowed) {
      const { error } = await client.rpc('dcc_set_saferoom', { p_campaign_id: campaignId, p_crawler_ids: crawlerIds, p_allowed: allowed });
      if (error?.code === 'PGRST202') throw new Error('Saferoom status is unavailable. Apply migration 024 and reload.');
      if (error) throw safeRoomError(error);
    },
  };
}
