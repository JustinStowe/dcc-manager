import { describe, expect, it, vi } from 'vitest';
import { executeAdvancementCommand } from './advancement-commands';
import type { CampaignWorkspace } from './campaign-workspace';
import { INITIAL_ADVANCEMENT } from '@/domain/advancement';
import { createTutorialProfile } from '@/domain/tutorial';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
const GM = '11111111-1111-4111-8111-111111111111', PLAYER = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333', GAME = '44444444-4444-4444-8444-444444444444';
const ID = '55555555-5555-4555-8555-555555555555', VERSION = '66666666-6666-4666-8666-666666666666';
function workspace(userId = GM, reconciled = true): CampaignWorkspace {
  const profile = createTutorialProfile(tutorialDraftFixture());
  return { userId, campaign: { id: GAME, name: 'Game', gmUserId: GM, playerUserIds: [PLAYER, OTHER], crawlers: [{ ownerUserId: PLAYER, crawler: { id: ID, campaignId: GAME, name: 'Carl', baseSegments: 10, constitution: 3, currentSegments: 0, ruleset: 'tutorial-v1' } }] }, versions: { [ID]: VERSION },
    tutorials: { [ID]: { profile, number: 500000 } }, inventories: { [ID]: [] },
    sheets: { [ID]: { level: 9, floor: 3, effects: [], advancement: { ...INITIAL_ADVANCEMENT, reconciled, authorized: reconciled ? 6 : 0 } } },
    loadouts: { [ID]: { baseline: profile.stats, defenseBase: 0, hotlist: [null,null,null,null,null,null,null,null,null,null] } } };
}
function form(operation: string, payload: Record<string, unknown>) {
  const f = new FormData(); for (const [k,v] of Object.entries({ crawlerId: ID, version: VERSION, operation, payload: JSON.stringify(payload) })) f.set(k,v); return f;
}
const allocation = { strength: 2, intelligence: 1, constitution: 0, dexterity: 0, charisma: 0 };
describe('advancement command boundary', () => {
  it.each(['award','authorize','reconcile','human-benefit'])('rejects player management of %s', async operation => {
    const act = vi.fn(); await expect(executeAdvancementCommand(workspace(PLAYER), form(operation, {}), { act })).rejects.toThrow('GM'); expect(act).not.toHaveBeenCalled();
  });
  it('rejects other owners, nonmembers, other campaign targets, and stale forms', async () => {
    const act = vi.fn();
    await expect(executeAdvancementCommand(workspace(OTHER), form('allocate', { allocation }), { act })).rejects.toThrow('access');
    await expect(executeAdvancementCommand(workspace(VERSION), form('allocate', { allocation }), { act })).rejects.toThrow('access');
    const target = form('allocate', { allocation }); target.set('crawlerId', OTHER);
    await expect(executeAdvancementCommand(workspace(), target, { act })).rejects.toThrow('access');
    const stale = form('award', { amount: 1 }); stale.set('version', OTHER);
    await expect(executeAdvancementCommand(workspace(), stale, { act })).rejects.toThrow('changed'); expect(act).not.toHaveBeenCalled();
  });
  it.each([PLAYER, GM])('allows bounded allocation for owner or GM; strips supplied totals %s', async user => {
    const act = vi.fn();
    await executeAdvancementCommand(workspace(user), form('allocate', { allocation, spent: 0, authorized: 747, health: 10, bases: { strength: 999 }, enhanced: 999 }), { act });
    expect(act).toHaveBeenCalledWith({ crawlerId: ID, version: VERSION, operation: 'allocate', payload: { allocation } });
  });
  it('requires reconciliation and rejects overspending before persistence', async () => {
    const act = vi.fn();
    await expect(executeAdvancementCommand(workspace(GM, false), form('award', { amount: 1, source: 'quest', reason: 'Quest' }), { act })).rejects.toThrow('reconcile');
    await expect(executeAdvancementCommand(workspace(PLAYER), form('allocate', { allocation: { ...allocation, strength: 6 } }), { act })).rejects.toThrow(); expect(act).not.toHaveBeenCalled();
  });
  it('records only reviewed legacy entitlement and preserves snapshot stats', async () => {
    const act = vi.fn(), w = workspace(GM, false), before = structuredClone(w);
    await executeAdvancementCommand(w, form('reconcile', { level: 9, spent: 15, confirmed: true, reason: '  Previous manual gains  ' }), { act });
    expect(act.mock.calls[0][0].payload).toEqual({ level: 9, spent: 15, confirmed: true, reason: 'Previous manual gains' }); expect(w).toEqual(before);
  });
  it('validates award source and reason and does not grant authorization with an award', async () => {
    const act = vi.fn();
    await executeAdvancementCommand(workspace(), form('award', { amount: 2, source: 'boss', reason: 'Borough boss', authorized: 30 }), { act });
    expect(act.mock.calls[0][0].payload).toEqual({ amount: 2, source: 'boss', reason: 'Borough boss' });
    await expect(executeAdvancementCommand(workspace(), form('award', { amount: 1, source: 'xp', reason: 'Test' }), { act })).rejects.toThrow('source');
    await expect(executeAdvancementCommand(workspace(), form('award', { amount: 1, source: 'quest', reason: ' ' }), { act })).rejects.toThrow('reason'); expect(act).toHaveBeenCalledTimes(1);
  });
  it('requires a confirmed saferoom and supports revoke and selected Human benefits', async () => {
    const act = vi.fn();
    await expect(executeAdvancementCommand(workspace(), form('authorize', { amount: 3, saferoom: false, reason: 'Room' }), { act })).rejects.toThrow('saferoom');
    await executeAdvancementCommand(workspace(), form('authorize', { amount: 0, reason: 'Left room' }), { act });
    await executeAdvancementCommand(workspace(), form('human-benefit', { enabled: true, confirmed: true, reason: 'Chose Human' }), { act }); expect(act).toHaveBeenCalledTimes(2);
  });
  it('rejects effective stat and Favor overflow and propagates storage failures', async () => {
    const act = vi.fn(), w = workspace();
    const baseline = { ...w.loadouts![ID].baseline, strength: { base: 10000, enhanced: 10000 } };
    await expect(executeAdvancementCommand({ ...w, loadouts: { [ID]: { ...w.loadouts![ID], baseline } } }, form('allocate', { allocation }), { act })).rejects.toThrow();
    const rich = { ...w, sheets: { [ID]: { ...w.sheets![ID], advancement: { ...INITIAL_ADVANCEMENT, humanFavor: true } } }, tutorials: { [ID]: { ...w.tutorials![ID], profile: { ...w.tutorials![ID].profile, favor: 2147483647 } } } };
    await expect(executeAdvancementCommand(rich, form('award', { amount: 1, source: 'quest', reason: 'Quest' }), { act })).rejects.toThrow(); expect(act).not.toHaveBeenCalled();
    await expect(executeAdvancementCommand(w, form('allocate', { allocation }), { async act() { throw new Error('Conflict'); } })).rejects.toThrow('Conflict');
  });
});
