import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notFound, redirect } from 'next/navigation';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import EncounterPage from './page';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('Not found'); }),
  redirect: vi.fn((destination: string) => { throw new Error(`Redirect: ${destination}`); }),
}));
vi.mock('@/adapters/supabase-authentication', () => ({ requireCurrentUser: vi.fn() }));
vi.mock('@/adapters/supabase-campaign-repository', () => ({ loadCampaignWorkspace: vi.fn() }));

const GM = '11111111-1111-4111-8111-111111111111';
const PLAYER = '22222222-2222-4222-8222-222222222222';
const GAME = '33333333-3333-4333-8333-333333333333';
function user(id: string): Awaited<ReturnType<typeof requireCurrentUser>> {
  return { id, email: `${id}@example.invalid`, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-11-25T00:00:00Z' };
}
const campaign = { id: GAME, name: 'Test game', gmUserId: GM, playerUserIds: [PLAYER], crawlers: [] };
const params = { params: Promise.resolve({ campaignId: GAME }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireCurrentUser).mockResolvedValue(user(GM));
  vi.mocked(loadCampaignWorkspace).mockResolvedValue({ userId: GM, campaign, versions: {}, encounter: null });
});

describe('separate encounter window', () => {
  it('renders the GM tracker from the shared campaign workspace', async () => {
    const page = await EncounterPage(params);
    expect(loadCampaignWorkspace).toHaveBeenCalledWith(GM, GAME);
    expect(page.props.children[2].props).toMatchObject({ campaign, encounter: null });
  });
  it('keeps non-GMs out of the encounter route', async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue(user(PLAYER));
    vi.mocked(loadCampaignWorkspace).mockResolvedValue({ userId: PLAYER, campaign, versions: {}, encounter: null });
    await expect(EncounterPage(params)).rejects.toThrow('Not found');
    expect(notFound).toHaveBeenCalled();
  });
  it('handles missing games and malformed IDs', async () => {
    vi.mocked(loadCampaignWorkspace).mockResolvedValue({ userId: GM, campaign: null, versions: {} });
    await expect(EncounterPage(params)).rejects.toThrow('Redirect: /?notice=game-unavailable');
    expect(redirect).toHaveBeenCalledWith('/?notice=game-unavailable');
    vi.clearAllMocks();
    await expect(EncounterPage({ params: Promise.resolve({ campaignId: 'invalid' }) })).rejects.toThrow('Not found');
    expect(loadCampaignWorkspace).not.toHaveBeenCalled();
  });
});
