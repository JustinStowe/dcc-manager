import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from './supabase-campaign-repository';
import type { SelectionMenuPort } from '@/services/selection-menu-commands';
export async function createSelectionMenuPort():Promise<SelectionMenuPort>{const client=createClient(await cookies());return{async act(campaignId,operation,payload){const{data,error}=await client.rpc('dcc_selection_menu_action',{p_campaign_id:campaignId,p_operation:operation,p_payload:payload});if(error?.code==='22023')throw new Error('Menu unavailable. Check the floor, existing selection, completed milestone and specialization choices.');if(error)throw campaignDatabaseError(error);return data as {pushed?:number;skipped?:number};}};}
