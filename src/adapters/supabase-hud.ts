import { cookies } from 'next/headers';
import { hudSnapshotSchema } from '@/domain/hud';
import type { HudPort } from '@/services/hud-commands';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from './supabase-campaign-repository';

function hudError(error: { code?: string }) {
  if (error.code === '40001') return new Error('The timer changed in another session. Close and reopen Floor Collapse before trying again.');
  if (error.code === '22023' || error.code === '23514') return new Error('Check the alert, floor and timer values. A running timer needs time remaining.');
  if (error.code === '54000') return new Error('Too many alerts. Wait a minute before broadcasting again.');
  return campaignDatabaseError(error);
}
export async function createHudPort(): Promise<HudPort> {
  const client = createClient(await cookies());
  return {
    async snapshot(campaignId, floor, before) {
      const { data, error } = await client.rpc('dcc_hud_snapshot', { p_campaign_id: campaignId, p_floor: floor, p_before: before ?? null });
      if (error) throw hudError(error);
      return hudSnapshotSchema.parse(data);
    },
    async act(campaignId, command) {
      const { operation, ...payload } = command;
      const { error } = await client.rpc('dcc_hud_action', { p_campaign_id: campaignId, p_operation: operation, p_payload: payload });
      if (error) throw hudError(error);
    },
  };
}
