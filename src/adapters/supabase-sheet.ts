import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from './supabase-campaign-repository';
import type { SheetPort } from '@/services/sheet-commands';
export async function createSheetPort():Promise<SheetPort>{
  const client=createClient(await cookies());
  return {async act(input){const {error}=await client.rpc('dcc_sheet_action',{p_crawler_id:input.crawlerId,p_expected_version:input.version,p_operation:input.operation,p_payload:input.payload});if(error){if(error.code==='23505')throw new Error('That Crawler Number is already used in this game. Choose another number.');if(error.code==='22023')throw new Error('Change rejected. Check values, damage types, and available resources.');throw campaignDatabaseError(error);}}};
}
