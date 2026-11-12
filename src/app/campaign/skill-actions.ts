'use server';
import { revalidatePath } from 'next/cache';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { createSkillPort } from '@/adapters/supabase-skills';
import { executeSkillCommand } from '@/services/skill-commands';
import { requireUuid, type CampaignFormState } from '@/services/campaign-workspace';
export async function skillAction(_previous: CampaignFormState, form: FormData): Promise<CampaignFormState> {
  const user = await requireCurrentUser(); let campaignId: string; let notice: string;
  try { const raw = form.get('campaignId'); if (typeof raw !== 'string') throw new RangeError('Choose a game first.'); campaignId = requireUuid(raw); notice = await executeSkillCommand(await loadCampaignWorkspace(user.id,campaignId),form,await createSkillPort()); }
  catch (error) { return { error: error instanceof Error ? error.message : 'Could not save the ability.', notice: null }; }
  revalidatePath(`/games/${campaignId}`); return { error: null, notice };
}
