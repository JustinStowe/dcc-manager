import { describe, expect, it, vi } from 'vitest';
import { executeThirdFloorCommand } from './third-floor-commands';
import type { CampaignWorkspace } from './campaign-workspace';
import { INITIAL_THIRD_FLOOR } from '@/domain/third-floor';
import { INITIAL_ADVANCEMENT } from '@/domain/advancement';
import { createTutorialProfile } from '@/domain/tutorial';
import { seedAbilities } from '@/domain/abilities';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
const GM = '11111111-1111-4111-8111-111111111111', PLAYER = '22222222-2222-4222-8222-222222222222', OTHER = '33333333-3333-4333-8333-333333333333';
const GAME = '44444444-4444-4444-8444-444444444444', ID = '55555555-5555-4555-8555-555555555555', VERSION = '66666666-6666-4666-8666-666666666666';
function workspace(userId = GM, reviewed = true): CampaignWorkspace {
  const profile = createTutorialProfile(tutorialDraftFixture());
  return { userId, campaign: { id: GAME, name: 'Game', gmUserId: GM, playerUserIds: [PLAYER, OTHER], crawlers: [{ ownerUserId: PLAYER, crawler: { id: ID, campaignId: GAME, name: 'Carl', baseSegments: 10, constitution: 3, currentSegments: 0, ruleset: 'tutorial-v1' } }] }, versions: { [ID]: VERSION },
    tutorials: { [ID]: { profile, number: 500000 } }, inventories: { [ID]: [] }, skills: { [ID]: seedAbilities(profile) },
    sheets: { [ID]: { level: 9, floor: 3, effects: [], advancement: INITIAL_ADVANCEMENT, thirdFloor: { ...INITIAL_THIRD_FLOOR, reviewed, offers: reviewed ? ['human|blizzardmancer'] : [] } } },
    loadouts: { [ID]: { baseline: profile.stats, defenseBase: 0, hotlist: [null,null,null,null,null,null,null,null,null,null] } } };
}
function form(operation: string, payload: Record<string, unknown>) {
  const f = new FormData(); for (const [key,value] of Object.entries({ crawlerId: ID, version: VERSION, operation, payload: JSON.stringify({ confirmed: true, reason: 'Reviewed', ...payload }) })) f.set(key,value); return f;
}
describe('Third Floor command permissions and persistence contract', () => {
  it.each(['review','offer'])('reserves %s for the GM', async operation => {
    const act = vi.fn(); await expect(executeThirdFloorCommand(workspace(PLAYER), form(operation, {}), { act })).rejects.toThrow('GM'); expect(act).not.toHaveBeenCalled();
  });
  it('rejects other owners, nonmembers, targets from other games and stale versions', async () => {
    const act = vi.fn();
    for (const user of [OTHER, VERSION]) await expect(executeThirdFloorCommand(workspace(user), form('select', {}), { act })).rejects.toThrow('access');
    const other = form('select', {}); other.set('crawlerId', OTHER); await expect(executeThirdFloorCommand(workspace(), other, { act })).rejects.toThrow('access');
    const stale = form('select', {}); stale.set('version', OTHER); await expect(executeThirdFloorCommand(workspace(), stale, { act })).rejects.toThrow('changed'); expect(act).not.toHaveBeenCalled();
  });
  it.each([PLAYER,GM])('sends only the approved pair and validated choices for %s', async user => {
    const act = vi.fn(), w = workspace(user), before = structuredClone(w);
    await executeThirdFloorCommand(w, form('select', { pair: 'human|blizzardmancer', choices: {}, stats: { intelligence: 999 }, rank: 20, favor: 999, selected: true }), { act });
    expect(act).toHaveBeenCalledWith({ crawlerId: ID, version: VERSION, operation: 'select', payload: { pair: 'human|blizzardmancer', choices: {}, confirmed: true, reason: 'Reviewed' } }); expect(w).toEqual(before);
  });
  it('rejects unoffered pairs, missing review, unavailable level data and Floor 2', async () => {
    const act = vi.fn(), w = workspace();
    await expect(executeThirdFloorCommand(w, form('select', { pair: 'human|fighter', choices: {} }), { act })).rejects.toThrow('offer');
    await expect(executeThirdFloorCommand(workspace(GM, false), form('offer', { offers: ['human|fighter'] }), { act })).rejects.toThrow('review');
    await expect(executeThirdFloorCommand({ ...w, sheets: { [ID]: { ...w.sheets![ID], advancement: { ...INITIAL_ADVANCEMENT, reconciled: false } } } }, form('select', { pair: 'human|blizzardmancer', choices: {} }), { act })).rejects.toThrow('advancement');
    await expect(executeThirdFloorCommand({ ...w, sheets: { [ID]: { ...w.sheets![ID], floor: 2 } } }, form('offer', { offers: ['human|fighter'] }), { act })).rejects.toThrow('Floor'); expect(act).not.toHaveBeenCalled();
  });
  it('reconciles existing benefits without sending any bonus changes', async () => {
    const act = vi.fn();
    await executeThirdFloorCommand(workspace(GM, false), form('review', { mode: 'existing', raceId: 'human', classId: 'fighter', stats: { strength: 999 } }), { act });
    expect(act.mock.calls[0][0].payload).toEqual({ mode: 'existing', raceId: 'human', classId: 'fighter', raceName: 'Human', className: 'Boring Ol’ Fighter', size: 4, move: 20, step: 10, confirmed: true, reason: 'Reviewed' });
  });
  it('requires confirmation, bounded reasons and prerequisites without granting through them', async () => {
    const act = vi.fn();
    await expect(executeThirdFloorCommand(workspace(), form('offer', { offers: ['amazonian|fighter'] }), { act })).rejects.toThrow('Rank 5');
    await expect(executeThirdFloorCommand(workspace(), form('offer', { offers: [], confirmed: false }), { act })).rejects.toThrow('Confirm');
    await expect(executeThirdFloorCommand(workspace(), form('offer', { offers: [], reason: '' }), { act })).rejects.toThrow('reason'); expect(act).not.toHaveBeenCalled();
  });
  it('rejects derived gear overflow before persistence and propagates database conflicts', async () => {
    const act = vi.fn(), w = workspace(), baseline = structuredClone(w.loadouts![ID].baseline);
    baseline.intelligence = { base: 9994, enhanced: 9994 };
    const overflow = { ...w, loadouts: { [ID]: { ...w.loadouts![ID], baseline } }, inventories: { [ID]: [{ id: OTHER, name: 'Hat', kind: 'gear' as const, quantity: 1, notes: '', gearSlot: 'head' as const, location: 'head' as const, bonuses: { strength: 0, intelligence: 1, constitution: 0, dexterity: 0, charisma: 0, dr: 0, evade: 0 } }] } };
    await expect(executeThirdFloorCommand(overflow, form('select', { pair: 'human|blizzardmancer', choices: {} }), { act })).rejects.toThrow(); expect(act).not.toHaveBeenCalled();
    await expect(executeThirdFloorCommand(w, form('select', { pair: 'human|blizzardmancer', choices: {} }), { async act() { throw new Error('Conflict'); } })).rejects.toThrow('Conflict');
  });
});
