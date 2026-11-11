import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { createCrawlerProfilePort } from '@/adapters/supabase-crawler-profiles';
import { crawlerProfileAction } from './actions';
import type { CrawlerProfilePort } from '@/services/crawler-profiles';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/adapters/supabase-authentication', () => ({
  requireCurrentUser: vi.fn(async () => ({ id: '11111111-1111-1111-1111-111111111111' })),
}));
vi.mock('@/adapters/supabase-crawler-profiles', () => ({ createCrawlerProfilePort: vi.fn() }));

const port: CrawlerProfilePort = { save: vi.fn(), remove: vi.fn(), use: vi.fn() };
const VERSION = '22222222-2222-2222-2222-222222222222';
const initialState = { error: null, notice: null };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(createCrawlerProfilePort).mockResolvedValue(port);
});

function deletion() {
  const form = new FormData();
  form.set('operation', 'delete-profile');
  form.set('slot', '2');
  form.set('version', VERSION);
  form.set('confirmed', 'yes');
  return form;
}

describe('crawler profile action refresh', () => {
  it('deletes the selected version and refreshes the lobby and profile page', async () => {
    const result = await crawlerProfileAction(initialState, deletion());
    expect(port.remove).toHaveBeenCalledWith(2, VERSION);
    expect(result.error).toBeNull();
    expect(result.notice).toContain('removed');
    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/crawlers');
  });

  it('reports stale-slot conflicts without claiming deletion or revalidating', async () => {
    vi.mocked(port.remove).mockRejectedValue(new Error('Profile slot changed. Refresh and try again.'));
    const result = await crawlerProfileAction(initialState, deletion());
    expect(result).toEqual({ error: 'Profile slot changed. Refresh and try again.', notice: null });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
