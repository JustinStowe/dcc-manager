import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from './supabase-campaign-repository';
import type { InventoryPort } from '@/services/inventory-commands';

export async function createInventoryPort(): Promise<InventoryPort> {
  const client = createClient(await cookies());
  return { async act(input) {
    const { error } = await client.rpc('dcc_inventory_action', {
      p_crawler_id: input.crawlerId, p_expected_version: input.version,
      p_operation: input.operation, p_item_id: input.itemId, p_item: input.operation === 'classify' ? { effect: input.effect } : input.item, p_location: input.location,
    });
    if (error) {
      if (error.code === '22023') throw new Error('Inventory change rejected. Check quantities and equipment slots, then refresh the campaign.');
      throw campaignDatabaseError(error);
    }
  } };
}
