'use server';
import { revalidatePath } from 'next/cache';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { createProgressionPort } from '@/adapters/supabase-progression';
import { executeProgressionCommand } from '@/services/progression-commands';
import { requireUuid, type CampaignFormState } from '@/services/campaign-workspace';
export async function progressionAction(_previous:CampaignFormState,form:FormData):Promise<CampaignFormState>{
 const user=await requireCurrentUser();let campaignId:string;
 try{campaignId=requireUuid(String(form.get('campaignId')));await executeProgressionCommand(await loadCampaignWorkspace(user.id,campaignId),form,await createProgressionPort());}
 catch(error){return{error:error instanceof Error?error.message:'Could not save Race/Class progress.',notice:null};}
 revalidatePath(`/games/${campaignId}`);return{error:null,notice:'Race/Class progress saved.'};
}
