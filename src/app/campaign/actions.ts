'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { createCampaignWritePort, loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { executeCampaignCommand, requireUuid, type CampaignFormState } from '@/services/campaign-workspace';
import { getCampaignRole } from '@/domain';
import { setGameJoining } from '@/adapters/supabase-game-lobby';

export async function campaignAction(_previous: CampaignFormState, form: FormData): Promise<CampaignFormState> {
  const user = await requireCurrentUser();
  let campaignId: string;
  let notice: string;
  try {
    const rawId = form.get('campaignId');
    if (typeof rawId !== 'string') throw new RangeError('Choose a game from the lobby.');
    campaignId = requireUuid(rawId);
    const workspace = await loadCampaignWorkspace(user.id, campaignId);
    if (form.get('operation') === 'set-joining') {
      if (!workspace.campaign || getCampaignRole(workspace.campaign, user.id) !== 'gm') throw new Error('Only this game GM can change joining.');
      const accepting = form.get('accepting');
      if (accepting !== 'true' && accepting !== 'false') throw new RangeError('Choose a joining state.');
      await setGameJoining(campaignId, accepting === 'true');
      notice = accepting === 'true' ? 'Game Code joining is open.' : 'Game Code joining is paused. Existing members keep access.';
    } else {
      notice = await executeCampaignCommand(workspace, form, await createCampaignWritePort());
    }
  } catch (error) {
    if (error instanceof SyntaxError) return { error: 'The browser save could not be imported.', notice: null };
    return { error: error instanceof Error ? error.message : 'Could not save the campaign change.', notice: null };
  }
  revalidatePath('/');
  revalidatePath(`/games/${campaignId}`);
  revalidatePath(`/games/${campaignId}/create`);
  if (form.get('operation') === 'create' || form.get('operation') === 'import') redirect(`/games/${campaignId}`);
  return { error: null, notice };
}
