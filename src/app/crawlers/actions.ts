'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { createCrawlerProfilePort, rollCrawlerProfile } from '@/adapters/supabase-crawler-profiles';
import { executeProfileCommand } from '@/services/crawler-profiles';
import { requireUuid, type CampaignFormState } from '@/services/campaign-workspace';

export async function crawlerProfileAction(_previous: CampaignFormState, form: FormData): Promise<CampaignFormState> {
  const user = await requireCurrentUser();
  let notice: string;
  let destination: string | null = null;
  try {
    notice = await executeProfileCommand(user.id, form, await createCrawlerProfilePort());
    if (form.get('operation') === 'use-profile') destination = `/games/${requireUuid(String(form.get('campaignId')))}`;
  } catch (error) {
    return { error: error instanceof SyntaxError || error instanceof TypeError ? 'Review the crawler profile and try again.' : error instanceof Error ? error.message : 'Could not save your crawler profile.', notice: null };
  }
  revalidatePath('/crawlers');
  if (destination) { revalidatePath(destination); redirect(destination); }
  return { error: null, notice };
}

export async function rollProfileStats(slot: number) {
  await requireCurrentUser();
  try { return { roll: await rollCrawlerProfile(slot), error: null }; }
  catch (error) { return { roll: null, error: error instanceof Error ? error.message : 'Could not retrieve the saved profile roll.' }; }
}