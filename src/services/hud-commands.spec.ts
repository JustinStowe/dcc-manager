import { describe, expect, it, vi } from 'vitest';
import { executeHudCommand } from './hud-commands';
import { progressionFixture, PG_IDS as I } from '@/test/progression-fixture';
const broadcast = { operation: 'broadcast', requestId: I.version, category: 'Achievement', title: 'A first!', body: 'Reviewed at the table.', crawlerId: I.crawler };
describe('HUD command permissions', () => {
  it('lets the GM send to a crawler in this game', async () => { const act = vi.fn(); await executeHudCommand(progressionFixture().campaign!, I.gm, broadcast, { act, snapshot: vi.fn() }); expect(act).toHaveBeenCalledWith(I.game, broadcast); });
  it.each([broadcast, { operation: 'timer-set', floor: 3, version: null, seconds: 60, start: true }])('rejects player table controls', async input => { const act = vi.fn(); await expect(executeHudCommand(progressionFixture().campaign!, I.player, input, { act, snapshot: vi.fn() })).rejects.toThrow('Only the GM'); expect(act).not.toHaveBeenCalled(); });
  it('allows personal read acknowledgements and rejects outsiders', async () => { const act = vi.fn(), input = { operation: 'read-all', through: '15' }; await executeHudCommand(progressionFixture().campaign!, I.player, input, { act, snapshot: vi.fn() }); expect(act).toHaveBeenCalledTimes(1); await expect(executeHudCommand(progressionFixture().campaign!, I.version, input, { act, snapshot: vi.fn() })).rejects.toThrow('access'); });
  it('rejects cross-game targets, empty broadcasts and forged fields before writing', async () => { const act = vi.fn(); for (const input of [{ ...broadcast, crawlerId: I.other }, { ...broadcast, body: ' ' }, { ...broadcast, recipients: [I.other] }]) await expect(executeHudCommand(progressionFixture().campaign!, I.gm, input, { act, snapshot: vi.fn() })).rejects.toThrow(); expect(act).not.toHaveBeenCalled(); });
});
