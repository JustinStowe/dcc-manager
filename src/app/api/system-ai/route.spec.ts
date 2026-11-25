import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PG_IDS, progressionFixture } from '@/test/progression-fixture';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), load: vi.fn(), execute: vi.fn(), groq: vi.fn(), usage: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({}) }));
vi.mock('@/utils/supabase/server', () => ({ createClient: () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock('@/adapters/supabase-campaign-repository', () => ({ loadCampaignWorkspace: mocks.load }));
vi.mock('@/adapters/groq-client', () => ({ createGroqClient: mocks.groq, systemAiModel: () => 'openai/gpt-oss-20b' }));
vi.mock('@/adapters/supabase-ai-usage', () => ({ createAiUsagePort: mocks.usage }));
vi.mock('@/services/system-ai-commands', () => ({ executeSystemAi: mocks.execute }));

import { POST } from './route';
import { SystemAiError } from '@/lib/ai/systemAi';

const input = { campaignId: PG_IDS.game, crawlerId: PG_IDS.crawler, version: PG_IDS.version, purpose: 'custom-build', raceId: 'human', kind: 'class', earth: true, theme: 'A guardian' };
function request(headers: Record<string, string>) {
  return new Request('http://localhost:3000/api/system-ai', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(input) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: PG_IDS.player } }, error: null });
  mocks.load.mockResolvedValue(progressionFixture(PG_IDS.player));
  mocks.groq.mockReturnValue({});
  mocks.usage.mockResolvedValue({});
  mocks.execute.mockResolvedValue({ purpose: 'custom-build', result: { name: 'Guardian' } });
});

describe('System AI HTTP boundary', () => {
  it('routes a custom Class request from the public LAN address through authentication and generation', async () => {
    const response = await POST(request({ origin: 'http://192.168.68.60:3000', host: '192.168.68.60:3000' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ purpose: 'custom-build', result: { name: 'Guardian' } });
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.execute).toHaveBeenCalledWith(expect.objectContaining({ userId: PG_IDS.player }), input, {}, {}, 'openai/gpt-oss-20b');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('accepts a correctly forwarded HTTPS request', async () => {
    expect((await POST(request({ origin: 'https://game.example', host: 'app.internal:3000', 'x-forwarded-host': 'game.example', 'x-forwarded-proto': 'https', 'sec-fetch-site': 'same-origin' }))).status).toBe(200);
  });

  it('rejects a cross-site request before loading cookies or calling Groq', async () => {
    const response = await POST(request({ origin: 'https://other.example', host: '192.168.68.60:3000', 'sec-fetch-site': 'cross-site' }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'origin' });
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.groq).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('still rejects an unsigned-in user on the correct origin', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request({ origin: 'http://192.168.68.60:3000', host: '192.168.68.60:3000' }))).status).toBe(401);
    expect(mocks.groq).not.toHaveBeenCalled();
  });

  it('preserves provider rate-limit responses after passing the origin check', async () => {
    mocks.execute.mockRejectedValueOnce(new SystemAiError('rate-limit', 'Please wait.', 429, 42));
    const response = await POST(request({ origin: 'http://localhost:3000', host: 'localhost:3000' }));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('42');
  });
});
