'use server';
import {revalidatePath} from 'next/cache';
import {requireCurrentUser} from '@/adapters/supabase-authentication';
import {loadCampaignWorkspace} from '@/adapters/supabase-campaign-repository';
import {createEffectPort} from '@/adapters/supabase-effects';
import {executeEffectCommand} from '@/services/effect-commands';
import {requireUuid,type CampaignFormState} from '@/services/campaign-workspace';
export async function effectAction(_previous:CampaignFormState,form:FormData):Promise<CampaignFormState>{const user=await requireCurrentUser();let campaignId:string,notice:string;try{const id=form.get('campaignId');if(typeof id!=='string')throw new RangeError('Choose a game.');campaignId=requireUuid(id);notice=await executeEffectCommand(await loadCampaignWorkspace(user.id,campaignId),form,await createEffectPort());}catch(error){return{error:error instanceof Error?error.message:'Could not save effect.',notice:null};}revalidatePath(`/games/${campaignId}`);return{error:null,notice};}
