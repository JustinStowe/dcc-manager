'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { createLobbyWritePort, deleteGame } from '@/adapters/supabase-game-lobby';
import { executeGameDeletion, executeLobbyCommand } from '@/services/game-lobby';
import type { CampaignFormState } from '@/services/campaign-workspace';

export async function lobbyAction(_previous: CampaignFormState, form: FormData): Promise<CampaignFormState> {
  const user = await requireCurrentUser();
  let destination: string;
  try {
    const result = await executeLobbyCommand(user.id, form, await createLobbyWritePort());
    destination = `/games/${result.gameId}${result.flow === 'join' ? '/create' : ''}`;
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not open the game.', notice: null };
  }
  revalidatePath('/');
  redirect(destination);
}

export async function deleteGameAction(_previous: CampaignFormState, form: FormData): Promise<CampaignFormState> {
  const user = await requireCurrentUser();
  try {
    await executeGameDeletion(user.id, form, { deleteGame });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not delete the game.', notice: null };
  }
  revalidatePath('/', 'layout');
  redirect('/');
}
