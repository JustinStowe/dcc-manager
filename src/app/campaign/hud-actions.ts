'use server';

import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { createHudPort } from '@/adapters/supabase-hud';
import { sequenceSchema } from '@/domain/hud';
import { requireUuid } from '@/services/campaign-workspace';
import { executeHudCommand } from '@/services/hud-commands';

export async function readHud(campaignId: string, floor: number, before?: string) {
  await requireCurrentUser();
  try {
    requireUuid(campaignId);
    if (!Number.isInteger(floor) || floor < 1 || floor > 18) throw new Error('Choose a valid floor.');
    if (before !== undefined) sequenceSchema.parse(before);
    return { snapshot: await (await createHudPort()).snapshot(campaignId, floor, before), error: null };
  } catch (error) { return { snapshot: null, error: error instanceof Error ? error.message : 'Could not load table alerts.' }; }
}
export async function changeHud(campaignId: string, input: unknown) {
  const user = await requireCurrentUser();
  try {
    const workspace = await loadCampaignWorkspace(user.id, requireUuid(campaignId));
    if (!workspace.campaign) throw new Error('Game access denied.');
    const port = await createHudPort(), command = await executeHudCommand(workspace.campaign, user.id, input, port);
    const snapshot = 'floor' in command ? await port.snapshot(campaignId, command.floor) : null;
    return { error: null, snapshot };
  } catch (error) { return { error: error instanceof Error ? error.message : 'Could not save table controls.' }; }
  // No page revalidation: HUD updates must never replace an in-progress sheet edit.
}
