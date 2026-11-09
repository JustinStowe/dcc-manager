'use server';

import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { rollTutorial } from '@/adapters/supabase-tutorial';

export async function rollTutorialStats(campaignId: string, ownerId: string) {
  await requireCurrentUser();
  try { return { roll: await rollTutorial(campaignId, ownerId), error: null }; }
  catch { return { roll: null, error: 'Could not roll stats. Check membership and the Tutorial database migration.' }; }
}
