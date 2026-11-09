import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { restoreTutorialProfile, STAT_KEYS } from '@/domain/tutorial';
import { requireUuid } from '@/services/campaign-workspace';
import { requireProfileSlot, type CrawlerProfilePort, type SavedCrawlerProfile } from '@/services/crawler-profiles';
import type { TutorialRoll } from '@/services/tutorial-commands';
import { campaignDatabaseError } from './supabase-campaign-repository';

export function profileDatabaseError(error: { code?: string; message?: string }): Error {
  if (error.code === '40001') return new Error('Profile slot changed. Refresh and try again.');
  if (error.code === '23505') return new Error('This profile slot is already occupied. Choose an empty slot.');
  const messages = ['Choose slot 1, 2, or 3.', 'Recover the saved roll for this profile slot.', 'Roll or recover your stats on the server first.', 'Recover your saved roll; rolled stats cannot be changed.', 'Saved starting stats cannot be changed. Use an empty slot for a new build.', 'Edit the saved profile without changing its stat method.'];
  if (error.code === '22023' && error.message && messages.includes(error.message)) return new Error(error.message);
  return campaignDatabaseError(error);
}

export async function loadCrawlerProfiles(): Promise<readonly SavedCrawlerProfile[]> {
  const client = createClient(await cookies());
  const { data, error } = await client.from('dcc_crawler_profiles').select('slot,name,profile,roll_id,version').order('slot');
  if (error) throw profileDatabaseError(error);
  return (data ?? []).map((row) => {
    if (typeof row.name !== 'string' || typeof row.version !== 'string') throw new Error('Invalid saved crawler profile.');
    return { slot: requireProfileSlot(String(row.slot)), name: row.name, profile: restoreTutorialProfile(row.profile), rollId: row.roll_id ? requireUuid(row.roll_id) : null, version: requireUuid(row.version) };
  });
}

export async function createCrawlerProfilePort(): Promise<CrawlerProfilePort> {
  const client = createClient(await cookies());
  return {
    async save(input) {
      const { error } = await client.rpc('dcc_save_profile', { p_slot: input.slot, p_name: input.name, p_profile: input.profile, p_roll_id: input.rollId, p_expected_version: input.version });
      if (error) throw profileDatabaseError(error);
    },
    async remove(slot, version) {
      const { error } = await client.rpc('dcc_delete_profile', { p_slot: slot, p_expected_version: version });
      if (error) throw profileDatabaseError(error);
    },
    async use(campaignId, slot, version) {
      const { error } = await client.rpc('dcc_use_crawler_profile', { p_campaign_id: campaignId, p_slot: slot, p_expected_version: version });
      if (error) throw profileDatabaseError(error);
    },
  };
}

export async function rollCrawlerProfile(slot: number): Promise<TutorialRoll> {
  const client = createClient(await cookies());
  const { data, error } = await client.rpc('dcc_roll_profile', { p_slot: requireProfileSlot(String(slot)) });
  if (error) throw profileDatabaseError(error);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid saved roll.');
  const roll = data as TutorialRoll;
  requireUuid(roll.id);
  for (const key of STAT_KEYS) if (!Number.isInteger(roll.scores?.[key]) || roll.scores[key] < 2 || roll.scores[key] > 6) throw new Error('Invalid rolled score.');
  return roll;
}