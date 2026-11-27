import { describe, expect, it, vi } from 'vitest';
import { createHudSync } from './hud-sync';
import type { HudSnapshot } from '@/domain/hud';
const snapshot: HudSnapshot = { events: [{ sequence: '2', category: 'Achievement', title: 'New!', body: '', crawlerId: null, floor: 3, readAt: null, createdAt: '2026-11-27T18:00:00Z' }], timer: null, serverNow: '2026-11-27T18:00:00Z', head: '2', unread: 1, hasMore: false };
function fixture() {
  let scheduled: () => void = () => {}, visible = true;
  const read = vi.fn().mockResolvedValue({ snapshot, error: null }), receive = vi.fn(), error = vi.fn();
  const queue = createHudSync({ initialHead: '1', read, receive, error, visible: () => visible, schedule(fn) { scheduled = fn; return 1; }, cancel: vi.fn() });
  return { queue, read, receive, error, hide() { visible = false; }, show() { visible = true; }, async flush() { scheduled(); await new Promise(resolve => setTimeout(resolve, 0)); } };
}
describe('HUD refresh independent of sheet edits', () => {
  it('announces a live arrival that races with an already-running silent refresh', async () => { const f = fixture(); let done!: (value: unknown) => void; f.read.mockImplementationOnce(() => new Promise(resolve => { done = resolve; })); f.queue.request(false); await f.flush(); f.queue.request(true); done({ snapshot, error: null }); await f.flush(); await f.flush(); expect(f.receive.mock.calls[0][1]).toHaveLength(1); expect(f.receive.mock.calls[1][1]).toEqual([]); });
  it('coalesces live signals and delivers each banner once without a router refresh', async () => { const f = fixture(); f.queue.request(true); f.queue.request(true); await f.flush(); expect(f.read).toHaveBeenCalledTimes(1); expect(f.receive.mock.calls[0][1]).toHaveLength(1); f.queue.request(true); await f.flush(); expect(f.receive.mock.calls[1][1]).toEqual([]); });
  it('restores unread history silently on polling or reconnect', async () => { const f = fixture(); f.queue.request(false); await f.flush(); expect(f.receive.mock.calls[0][0].unread).toBe(1); expect(f.receive.mock.calls[0][1]).toEqual([]); });
  it('waits in hidden tabs and suppresses background banners', async () => { const f = fixture(); f.hide(); f.queue.request(true); await f.flush(); expect(f.read).not.toHaveBeenCalled(); f.show(); f.queue.request(false); await f.flush(); expect(f.receive).toHaveBeenCalledTimes(1); expect(f.receive.mock.calls[0][1]).toEqual([]); });
  it('ignores late results after unmount and reports network failures without erasing data', async () => { const f = fixture(); let done!: (value: unknown) => void; f.read.mockImplementation(() => new Promise(resolve => { done = resolve; })); f.queue.request(true); await f.flush(); f.queue.dispose(); done({ snapshot, error: null }); await f.flush(); expect(f.receive).not.toHaveBeenCalled(); const g = fixture(); g.read.mockRejectedValue(new Error('offline')); g.queue.request(false); await g.flush(); expect(g.error).toHaveBeenCalled(); expect(g.receive).not.toHaveBeenCalled(); });
});
