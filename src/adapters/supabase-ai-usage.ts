import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from './supabase-campaign-repository';
import { SystemAiError } from '@/lib/ai/systemAi';
import type { AiUsagePort } from '@/services/system-ai-commands';
export async function createAiUsagePort():Promise<AiUsagePort>{const client=createClient(await cookies());return{
 async reserve(input){const{data,error}=await client.rpc('dcc_ai_reserve',{p_crawler_id:input.crawlerId,p_expected_version:input.version,p_purpose:input.purpose,p_fingerprint:input.fingerprint,p_model:input.model});if(error?.code==='P0001')throw new SystemAiError('rate-limit','The System request budget is busy. Please wait before retrying.',429,60);if(error)throw campaignDatabaseError(error);return data as {id:string;cached:unknown|null};},
 async finish(id,status,response,tokens){const{error}=await client.rpc('dcc_ai_finish',{p_id:id,p_status:status,p_response:response,p_tokens:tokens});if(error)throw campaignDatabaseError(error);}
};}
