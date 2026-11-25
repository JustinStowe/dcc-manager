'use server';
import { revalidatePath } from 'next/cache';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { createThirdFloorPort } from '@/adapters/supabase-third-floor';
import { executeThirdFloorCommand } from '@/services/third-floor-commands';
import { requireUuid, type CampaignFormState } from '@/services/campaign-workspace';
export async function thirdFloorAction(_previous: CampaignFormState, form: FormData): Promise<CampaignFormState> {
  const user = await requireCurrentUser(); let campaignId: string, notice: string;
  try {
    const raw = form.get('campaignId'); if (typeof raw !== 'string') throw new RangeError('Choose a game.');
    campaignId = requireUuid(raw);
    notice = await executeThirdFloorCommand(await loadCampaignWorkspace(user.id, campaignId), form, await createThirdFloorPort());
  } catch (error) { return { error: error instanceof Error ? error.message : 'Could not save selection.', notice: null }; }
  revalidatePath(`/games/${campaignId}`); revalidatePath('/'); return { error: null, notice };
}
