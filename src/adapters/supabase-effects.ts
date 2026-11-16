import {cookies} from 'next/headers';
import {createClient} from '@/utils/supabase/server';
import {campaignDatabaseError} from './supabase-campaign-repository';
import type {EffectPort} from '@/services/effect-commands';
export async function createEffectPort():Promise<EffectPort>{const client=createClient(await cookies());return{async act(input){const{error}=await client.rpc('dcc_effect_action',{p_crawler_id:input.crawlerId,p_expected_version:input.version,p_operation:input.operation,p_payload:input.payload});if(error){if(error.code==='22023')throw new Error('Effect rejected. Check the fields, duration and stat limits.');throw campaignDatabaseError(error);}}};}
