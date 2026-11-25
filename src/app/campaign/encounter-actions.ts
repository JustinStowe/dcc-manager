'use server';

import { revalidatePath } from 'next/cache';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { createEncounterPort } from '@/adapters/supabase-encounters';
import { requireUuid, type CampaignFormState } from '@/services/campaign-workspace';
import { executeEncounterCommand } from '@/services/encounter-commands';

export async function encounterAction(_previous: CampaignFormState, form: FormData): Promise<CampaignFormState> {
  const user = await requireCurrentUser();
  let campaignId: string;
  let notice: string;
  try {
    const id = form.get('campaignId');
    if (typeof id !== 'string') throw new RangeError('Choose a game.');
    campaignId = requireUuid(id);
    notice = await executeEncounterCommand(await loadCampaignWorkspace(user.id, campaignId), form, await createEncounterPort());
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save encounter.', notice: null };
  }
  revalidatePath(`/games/${campaignId}`);
  revalidatePath(`/games/${campaignId}/encounter`);
  return { error: null, notice };
}
