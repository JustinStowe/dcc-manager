import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from './supabase-campaign-repository';
import type { AdvancementPort } from '@/services/advancement-commands';

export async function createAdvancementPort(): Promise<AdvancementPort> {
  const client = createClient(await cookies());
  return { async act(input) {
    const { error } = await client.rpc('dcc_advancement_action', {
      p_crawler_id: input.crawlerId, p_expected_version: input.version,
      p_operation: input.operation, p_payload: input.payload,
    });
    if (error?.code === '22023') throw new Error('Advancement rejected. Check reconciliation, the level cap, pending points, and saferoom authorization.');
    if (error) throw campaignDatabaseError(error);
  } };
}
