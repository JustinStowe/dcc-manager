'use server';
import {revalidatePath} from 'next/cache';
import {requireCurrentUser} from '@/adapters/supabase-authentication';
import {loadCampaignWorkspace} from '@/adapters/supabase-campaign-repository';
import {createTemplatePort} from '@/adapters/supabase-templates';
import {executeTemplateCommand} from '@/services/template-commands';
import {requireUuid,type CampaignFormState} from '@/services/campaign-workspace';
export async function templateAction(_previous:CampaignFormState,form:FormData):Promise<CampaignFormState>{const user=await requireCurrentUser();let campaignId:string,notice:string;try{const id=form.get('campaignId');if(typeof id!=='string')throw new RangeError('Choose a game.');campaignId=requireUuid(id);notice=await executeTemplateCommand(await loadCampaignWorkspace(user.id,campaignId),form,await createTemplatePort());}catch(error){return{error:error instanceof Error?error.message:'Could not save template.',notice:null};}revalidatePath(`/games/${campaignId}`);return{error:null,notice};}
