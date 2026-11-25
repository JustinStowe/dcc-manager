import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from './supabase-campaign-repository';
import type { ProgressionPort } from '@/services/progression-commands';
export async function createProgressionPort():Promise<ProgressionPort>{
 const client=createClient(await cookies());return{async act(input){const{error}=await client.rpc('dcc_progression_action',{p_crawler_id:input.crawlerId,p_expected_version:input.version,p_operation:input.operation,p_payload:input.payload});if(error?.code==='22023')throw new Error('Selection rejected. Refresh and check evidence, budgets, benefit choices, overrides and prior selections.');if(error)throw campaignDatabaseError(error);}};
}
