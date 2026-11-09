import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirect, notFound } from 'next/navigation';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { loadCrawlerProfiles } from '@/adapters/supabase-crawler-profiles';
import { loadGameLobby } from '@/adapters/supabase-game-lobby';
import GamePage from './games/[campaignId]/page';
import CreateCrawlerPage from './games/[campaignId]/create/page';
import LobbyPage from './page';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((destination: string) => { throw new Error(`Redirect: ${destination}`); }),
  notFound: vi.fn(() => { throw new Error('Not found'); }),
}));
vi.mock('@/adapters/supabase-authentication', () => ({
  requireCurrentUser: vi.fn(async () => ({ id: '22222222-2222-2222-2222-222222222222', email: 'player@example.invalid' })),
}));
vi.mock('@/adapters/supabase-campaign-repository', () => ({ loadCampaignWorkspace: vi.fn() }));
vi.mock('@/adapters/supabase-crawler-profiles', () => ({ loadCrawlerProfiles: vi.fn() }));
vi.mock('@/adapters/supabase-game-lobby', () => ({ loadGameLobby: vi.fn(), loadHostSettings: vi.fn() }));
vi.mock('@/app/auth/actions', () => ({ signOut: vi.fn() }));
vi.mock('@/views/account-bar-view', () => ({ AccountBarView: () => null }));
vi.mock('@/views/campaign-view', () => ({ CampaignView: () => null }));
vi.mock('@/views/lobby-view', () => ({ LobbyView: () => null }));

const PLAYER = '22222222-2222-2222-2222-222222222222';
const GAME = '77777777-7777-7777-7777-777777777777';
const GM = '11111111-1111-1111-1111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadCampaignWorkspace).mockResolvedValue({ userId: PLAYER, campaign: null, versions: {} });
  vi.mocked(loadCrawlerProfiles).mockResolvedValue([]);
  vi.mocked(loadGameLobby).mockResolvedValue({ hosted: [], joined: [] });
});

describe.each([
  ['game page', GamePage],
  ['crawler creation page', CreateCrawlerPage],
] as const)('deleted game routing: %s', (_label, page) => {
  it('returns to the lobby with an unavailable notice when the game is gone', async () => {
    await expect(page({ params: Promise.resolve({ campaignId: GAME }) })).rejects.toThrow('Redirect: /?notice=game-unavailable');
    expect(redirect).toHaveBeenCalledWith('/?notice=game-unavailable');
    expect(notFound).not.toHaveBeenCalled();
    expect(loadCrawlerProfiles).not.toHaveBeenCalled();
  });
  it('keeps malformed IDs as not-found responses', async () => {
    await expect(page({ params: Promise.resolve({ campaignId: 'invalid' }) })).rejects.toThrow('Not found');
    expect(loadCampaignWorkspace).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
  it('does not misrepresent a database failure as a deleted game', async () => {
    vi.mocked(loadCampaignWorkspace).mockRejectedValue(new Error('Storage unavailable'));
    const result = await page({ params: Promise.resolve({ campaignId: GAME }) });
    expect(result.props.children[1].props.storageError).toBe('Storage unavailable');
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('existing game routing', () => {
  it('continues to send a new player to crawler creation', async () => {
    vi.mocked(loadCampaignWorkspace).mockResolvedValue({
      userId: PLAYER, versions: {}, campaign: { id: GAME, name: 'Existing game', gmUserId: GM, playerUserIds: [PLAYER], crawlers: [] },
    });
    await expect(GamePage({ params: Promise.resolve({ campaignId: GAME }) })).rejects.toThrow(`Redirect: /games/${GAME}/create`);
  });
});

describe('lobby unavailable notice', () => {
  it('shows the fixed availability message after a missing-game redirect', async () => {
    const result = await LobbyPage({ searchParams: Promise.resolve({ notice: 'game-unavailable' }) });
    expect(result.props.children[1].props.notice).toBe('This game is no longer available. It may have been deleted by its GM.');
  });
  it('does not echo arbitrary notice text or show a message on ordinary visits', async () => {
    for (const searchParams of [{}, { notice: 'untrusted text' }]) {
      const result = await LobbyPage({ searchParams: Promise.resolve(searchParams) });
      expect(result.props.children[1].props.notice).toBeNull();
    }
  });
});