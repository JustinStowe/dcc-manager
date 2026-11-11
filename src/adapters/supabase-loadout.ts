import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from './supabase-campaign-repository';
import type { LoadoutPort } from '@/services/loadout-commands';

export async function createLoadoutPort(): Promise<LoadoutPort> {
  const client = createClient(await cookies());
  return { async act(input) {
    const { error } = await client.rpc('dcc_loadout_action', {
      p_crawler_id: input.crawlerId, p_expected_version: input.version, p_operation: input.operation,
      p_slot: input.slot, p_kind: input.kind, p_target: input.target, p_location: input.location,
      p_bonuses: input.bonuses, p_baseline: input.baseline, p_amount: input.amount,
    });
    if (error) {
      if (error.code === '22023') throw new Error('Loadout change rejected. Check prepared targets, resources, gear slots, and bonus limits, then refresh.');
      throw campaignDatabaseError(error);
    }
  } };
}
