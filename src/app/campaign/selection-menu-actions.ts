'use server';
import { revalidatePath } from 'next/cache';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { createSelectionMenuPort } from '@/adapters/supabase-selection-menus';
import { executeSelectionMenuCommand } from '@/services/selection-menu-commands';
import { requireUuid, type CampaignFormState } from '@/services/campaign-workspace';
export async function selectionMenuAction(_previous:CampaignFormState,form:FormData):Promise<CampaignFormState>{
 const user=await requireCurrentUser();let campaignId:string,notice:string;
 try{campaignId=requireUuid(String(form.get('campaignId')));notice=await executeSelectionMenuCommand(await loadCampaignWorkspace(user.id,campaignId),form,await createSelectionMenuPort());}
 catch(error){return{error:error instanceof Error?error.message:'Could not update selection menus.',notice:null};}
 revalidatePath(`/games/${campaignId}`);return{error:null,notice};
}
