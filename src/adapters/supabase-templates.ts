import {cookies} from 'next/headers';
import {createClient} from '@/utils/supabase/server';
import {campaignDatabaseError} from './supabase-campaign-repository';
import type {TemplatePort} from '@/services/template-commands';
export async function createTemplatePort():Promise<TemplatePort>{const client=createClient(await cookies());return{async act(i){const{error}=await client.rpc('dcc_template_action',{p_campaign_id:i.campaignId,p_operation:i.operation,p_template_id:i.templateId??null,p_template_version:i.templateVersion??null,p_crawler_id:i.crawlerId??null,p_crawler_version:i.crawlerVersion??null,p_kind:i.kind??null,p_target:i.target??null,p_definition:i.definition??null,p_policy:i.policy??null,p_confirmed:i.confirmed??false});if(error){if(error.code==='22023')throw new Error('Template rejected. Check its fields, link target and limits.');throw campaignDatabaseError(error);}}};}
