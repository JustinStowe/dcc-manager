'use server';
import { ZodError } from 'zod';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { createSafeRoomPort } from '@/adapters/supabase-safe-room';
import { safeRoomQuerySchema } from '@/domain/safe-room';
import { requireUuid } from '@/services/campaign-workspace';
import { executeSafeRoomCommand } from '@/services/safe-room-commands';
function message(error: unknown) { return error instanceof ZodError ? 'Check the reward fields and item values.' : error instanceof Error ? error.message : 'Could not update the Safe Room.'; }
export async function readSafeRoom(crawlerId: string, query: unknown) {
  await requireCurrentUser();
  try { return { snapshot: await (await createSafeRoomPort()).snapshot(requireUuid(crawlerId), safeRoomQuerySchema.parse(query)), error: null }; }
  catch (error) { return { snapshot: null, error: message(error) }; }
}
export async function changeSafeRoom(campaignId: string, crawlerId: string, input: unknown) {
  const user = await requireCurrentUser();
  try { const port = await createSafeRoomPort(); await executeSafeRoomCommand(await loadCampaignWorkspace(user.id, requireUuid(campaignId)), requireUuid(crawlerId), input, port); return { error: null }; }
  catch (error) { return { error: message(error) }; }
  // Existing guarded live refresh updates the sheet after the Safe Room dialog closes.
}
