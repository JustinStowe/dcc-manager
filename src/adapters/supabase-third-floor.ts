import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from './supabase-campaign-repository';
import type { ThirdFloorPort } from '@/services/third-floor-commands';
export async function createThirdFloorPort(): Promise<ThirdFloorPort> {
  const client = createClient(await cookies());
  return { async act(input) {
    const { error } = await client.rpc('dcc_third_floor_action', { p_crawler_id: input.crawlerId, p_expected_version: input.version, p_operation: input.operation, p_payload: input.payload });
    if (error?.code === '22023') throw new Error('Selection rejected. Check the benefit review, offered pair, prerequisites, choices and stat limits.');
    if (error) throw campaignDatabaseError(error);
  } };
}
