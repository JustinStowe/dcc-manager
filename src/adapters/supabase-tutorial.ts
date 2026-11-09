import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from './supabase-campaign-repository';
import type { TutorialPort, TutorialRoll } from '@/services/tutorial-commands';
import { STAT_KEYS } from '@/domain/tutorial';
import { requireUuid } from '@/services/campaign-workspace';
import { profileDatabaseError } from './supabase-crawler-profiles';

function tutorialError(error: { code?: string; message?: string }): Error {
  const messages = ['Recover your saved roll; rolled stats cannot be changed.', 'Roll stats on the server first.', 'Cannot cast Heal while Dying or without 2 Mana.', 'Insufficient Mana.', 'No AI Favor available.', 'Zero health must stay zero.', 'Counter exceeds supported range.'];
  if (error.code === '22023' && error.message && messages.includes(error.message)) return new Error(error.message);
  return campaignDatabaseError(error);
}

export async function rollTutorial(campaignId: string, ownerId: string): Promise<TutorialRoll> {
  const client = createClient(await cookies());
  const { data, error } = await client.rpc('dcc_tutorial_roll', { p_campaign_id: requireUuid(campaignId), p_owner_user_id: requireUuid(ownerId) });
  if (error) throw campaignDatabaseError(error);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid roll response.');
  const result = data as TutorialRoll;
  requireUuid(result.id);
  for (const key of STAT_KEYS) if (!Number.isInteger(result.scores?.[key]) || result.scores[key] < 2 || result.scores[key] > 6) throw new Error('Invalid rolled score.');
  return result;
}
export async function createTutorialPort(): Promise<TutorialPort> {
  const client = createClient(await cookies());
  return {
    async create(input) {
      if (input.saveSlot != null) {
        const { error } = await client.rpc('dcc_create_tutorial_and_save', {
          p_campaign_id: input.campaignId, p_owner_user_id: input.ownerId, p_name: input.name,
          p_profile: input.profile, p_roll_id: input.rollId, p_save_slot: input.saveSlot,
        });
        if (error) throw profileDatabaseError(error);
        return;
      }
      const { error } = await client.rpc('dcc_create_tutorial', {
        p_campaign_id: input.campaignId, p_owner_user_id: input.ownerId, p_name: input.name,
        p_profile: input.profile, p_roll_id: input.rollId, p_convert_id: input.convertId, p_expected_version: input.version, p_slots: input.slots,
      });
      if (error) throw tutorialError(error);
    },
    async act(input) {
      const { error } = await client.rpc('dcc_tutorial_action', {
        p_crawler_id: input.crawlerId, p_expected_version: input.version, p_operation: input.operation,
        p_amount: input.amount, p_stats: input.stats, p_number: input.number,
      });
      if (error) throw tutorialError(error);
    },
  };
}
