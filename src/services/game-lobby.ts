import { createCampaign, getCampaignRole } from '@/domain';
import { requireUuid } from '@/services/campaign-workspace';
import type { CampaignWorkspace } from '@/services/campaign-workspace';

export interface GameSummary { readonly id: string; readonly name: string }
export interface GameLobby { readonly hosted: readonly GameSummary[]; readonly joined: readonly GameSummary[] }
export interface HostSettings { readonly code: string; readonly acceptingPlayers: boolean }
export interface LobbyWritePort {
  host(name: string): Promise<string>;
  join(code: string): Promise<string | null>;
}

export function getGameEntry(workspace: CampaignWorkspace): 'unavailable' | 'gm' | 'create' | 'sheet' {
  if (!workspace.campaign) return 'unavailable';
  const role = getCampaignRole(workspace.campaign, workspace.userId);
  if (role === null) return 'unavailable';
  if (role === 'gm') return 'gm';
  return workspace.campaign.crawlers.some((entry) => entry.ownerUserId === workspace.userId) ? 'sheet' : 'create';
}

export function normalizeGameCode(input: string): string {
  const code = input.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[0-9A-F]{32}$/.test(code)) throw new RangeError('Enter the complete Game Code provided by your GM.');
  return code;
}

export function formatGameCode(code: string): string {
  return normalizeGameCode(code).match(/.{8}/g)?.join('-') ?? code;
}

export async function executeLobbyCommand(userId: string, form: FormData, port: LobbyWritePort): Promise<{ gameId: string; flow: 'host' | 'join' }> {
  requireUuid(userId);
  const operation = form.get('operation');
  if (operation === 'host') {
    const name = form.get('name');
    if (typeof name !== 'string') throw new RangeError('Enter a game name.');
    const campaign = createCampaign({ id: 'new-game', name, gmUserId: userId });
    return { gameId: requireUuid(await port.host(campaign.name)), flow: 'host' };
  }
  if (operation === 'join') {
    const raw = form.get('code');
    if (typeof raw !== 'string') throw new RangeError('Enter your Game Code.');
    const gameId = await port.join(normalizeGameCode(raw));
    if (!gameId) throw new Error('Unable to join. Check the code with your GM, or wait a minute if you have tried repeatedly.');
    return { gameId: requireUuid(gameId), flow: 'join' };
  }
  throw new RangeError('Choose Host a Game or Join a Game.');
}
