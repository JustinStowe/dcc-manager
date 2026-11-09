'use server';

import { revalidatePath } from 'next/cache';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { createInventoryPort } from '@/adapters/supabase-inventory';
import { executeInventoryCommand } from '@/services/inventory-commands';
import { requireUuid, type CampaignFormState } from '@/services/campaign-workspace';

export async function inventoryAction(_previous: CampaignFormState, form: FormData): Promise<CampaignFormState> {
  const user = await requireCurrentUser();
  let campaignId: string;
  let notice: string;
  try {
    const raw = form.get('campaignId');
    if (typeof raw !== 'string') throw new RangeError('Choose a game first.');
    campaignId = requireUuid(raw);
    const workspace = await loadCampaignWorkspace(user.id, campaignId);
    notice = await executeInventoryCommand(workspace, form, await createInventoryPort());
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not update inventory.', notice: null };
  }
  revalidatePath(`/games/${campaignId}`);
  return { error: null, notice };
}
