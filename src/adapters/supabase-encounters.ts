import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from './supabase-campaign-repository';
import type { EncounterWritePort } from '@/services/encounter-commands';

export async function createEncounterPort(): Promise<EncounterWritePort> {
  const client = createClient(await cookies());
  return {
    async act(input) {
      const { error } = await client.rpc('dcc_encounter_action', {
        p_campaign_id: input.campaignId,
        p_expected_version: input.version,
        p_operation: input.operation,
        p_participant_id: input.participantId ?? null,
        p_name: input.name ?? null,
        p_initiative: input.initiative ?? null,
      });
      if (error) throw campaignDatabaseError(error);
    },
  };
}
