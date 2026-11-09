import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from '@/adapters/supabase-campaign-repository';
import { requireUuid } from '@/services/campaign-workspace';
import { normalizeGameCode, type GameLobby, type GameSummary, type HostSettings, type LobbyWritePort } from '@/services/game-lobby';

export async function loadGameLobby(userId: string): Promise<GameLobby> {
  const client = createClient(await cookies());
  const { data, error } = await client.from('dcc_campaigns').select('id,name,gm_user_id').order('name');
  if (error) throw campaignDatabaseError(error);
  const hosted: GameSummary[] = [];
  const joined: GameSummary[] = [];
  // Campaign RLS returns only games owned by or joined by this account.
  for (const value of data ?? []) {
    const row = value as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.gm_user_id !== 'string') throw new Error('Invalid lobby data.');
    const game = { id: requireUuid(row.id), name: row.name };
    (row.gm_user_id === userId ? hosted : joined).push(game);
  }
  return { hosted, joined };
}

export async function createLobbyWritePort(): Promise<LobbyWritePort> {
  const client = createClient(await cookies());
  return {
    async host(name) {
      const { data, error } = await client.rpc('dcc_host_game', { p_name: name });
      if (error) throw campaignDatabaseError(error);
      if (typeof data !== 'string') throw new Error('Could not create the game.');
      return requireUuid(data);
    },
    async join(code) {
      const { data, error } = await client.rpc('dcc_join_game', { p_code: code });
      if (error) throw campaignDatabaseError(error);
      return typeof data === 'string' ? requireUuid(data) : null;
    },
  };
}

export async function loadHostSettings(campaignId: string): Promise<HostSettings> {
  const client = createClient(await cookies());
  const { data, error } = await client.rpc('dcc_host_settings', { p_campaign_id: campaignId });
  if (error) throw campaignDatabaseError(error);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('Game Code is unavailable. Check the lobby migration.');
  const row = data as Record<string, unknown>;
  if (typeof row.code !== 'string' || typeof row.acceptingPlayers !== 'boolean') throw new Error('Invalid host settings.');
  return { code: normalizeGameCode(row.code), acceptingPlayers: row.acceptingPlayers };
}

export async function setGameJoining(campaignId: string, accepting: boolean): Promise<void> {
  const client = createClient(await cookies());
  const { error } = await client.rpc('dcc_set_joining', { p_campaign_id: requireUuid(campaignId), p_accepting: accepting });
  if (error) throw campaignDatabaseError(error);
}
