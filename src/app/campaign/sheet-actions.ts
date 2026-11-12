'use server';
import { revalidatePath } from 'next/cache';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { createSheetPort } from '@/adapters/supabase-sheet';
import { executeSheetCommand } from '@/services/sheet-commands';
import { requireUuid, type CampaignFormState } from '@/services/campaign-workspace';
export async function sheetAction(_previous:CampaignFormState,form:FormData):Promise<CampaignFormState>{
  const user=await requireCurrentUser();let campaignId:string;
  try{const raw=form.get('campaignId');if(typeof raw!=='string')throw new RangeError('Choose a game.');campaignId=requireUuid(raw);await executeSheetCommand(await loadCampaignWorkspace(user.id,campaignId),form,await createSheetPort());}
  catch(error){return {error:error instanceof Error?error.message:'Could not save sheet.',notice:null};}
  revalidatePath(`/games/${campaignId}`);revalidatePath('/');return {error:null,notice:'Sheet saved.'};
}
