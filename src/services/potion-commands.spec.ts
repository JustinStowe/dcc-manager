import { describe, expect, it } from 'vitest';
import { createCampaign, addCampaignPlayer } from '@/domain';
import { createCrawler } from '@/domain/crawler';
import { createTutorialProfile } from '@/domain/tutorial';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
import type { InventoryItem } from '@/domain/inventory';
import { executeInventoryCommand, type InventoryWrite } from './inventory-commands';
import type { CampaignWorkspace } from './campaign-workspace';

const GM = '11111111-1111-1111-1111-111111111111', PLAYER = '22222222-2222-2222-2222-222222222222';
const OTHER = '33333333-3333-3333-3333-333333333333', GAME = '77777777-7777-7777-7777-777777777777';
const ID = '55555555-5555-5555-5555-555555555555', ITEM = '66666666-6666-4666-8666-666666666666', VERSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
function fixture(userId = PLAYER, mana = 1, currentSegments = 10): CampaignWorkspace {
  let campaign = createCampaign({ id: GAME, name: 'Game', gmUserId: GM });
  campaign = addCampaignPlayer(addCampaignPlayer(campaign, GM, PLAYER), GM, OTHER);
  const crawler = { ...createCrawler({ id: ID, campaignId: GAME, name: 'Carl', baseSegments: 10, constitution: 3, ruleset: 'tutorial-v1' }), currentSegments };
  const item: InventoryItem = { id: ITEM, name: 'Potion', kind: 'consumable', quantity: 2, notes: '', gearSlot: 'none', location: 'stored', effect: 'mana-full' };
  return { userId, campaign: { ...campaign, crawlers: [{ ownerUserId: PLAYER, crawler }] }, versions: { [ID]: VERSION }, tutorials: { [ID]: { profile: { ...createTutorialProfile(tutorialDraftFixture()), mana }, number: 500000 } }, inventories: { [ID]: [item] } };
}
function form(changes: Record<string, string> = {}) {
  const result = new FormData(); for (const [key, value] of Object.entries({ operation: 'drink-mana', crawlerId: ID, itemId: ITEM, version: VERSION, confirmed: 'yes', ...changes })) result.set(key, value); return result;
}
function port() { const calls: InventoryWrite[] = []; return { calls, adapter: { async act(value: InventoryWrite) { calls.push(value); } } }; }
describe('Potion application boundary', () => {
  it.each([PLAYER, GM])('owner or GM records one atomic operation: %s', async (user) => {
    const p = port(); await executeInventoryCommand(fixture(user), form({ mana: '999', quantity: '999' }), p.adapter);
    expect(p.calls.length).toBe(1); expect(p.calls[0].operation).toBe('drink-mana'); expect(p.calls[0].item).toBe(null);
  });
  it('rejects another player', async () => {
    const p = port(); await expect(executeInventoryCommand(fixture(OTHER), form(), p.adapter)).rejects.toThrow('permission'); expect(p.calls.length).toBe(0);
  });
  it('requires table/timing confirmation', async () => {
    const p = port(); await expect(executeInventoryCommand(fixture(), form({ confirmed: 'no' }), p.adapter)).rejects.toThrow('Confirm'); expect(p.calls.length).toBe(0);
  });
  it('rejects stale versions', async () => {
    const p = port(); await expect(executeInventoryCommand(fixture(), form({ version: OTHER }), p.adapter)).rejects.toThrow('changed'); expect(p.calls.length).toBe(0);
  });
  it.each([[6, 10], [1, 0]])('does not write for full Mana or Dying: %s / %s', async (mana, health) => {
    const p = port(); await expect(executeInventoryCommand(fixture(PLAYER, mana, health), form(), p.adapter)).rejects.toThrow(); expect(p.calls.length).toBe(0);
  });
  it('requires loaded resources', async () => {
    const p = port(); await expect(executeInventoryCommand({ ...fixture(), tutorials: undefined }, form(), p.adapter)).rejects.toThrow('loaded'); expect(p.calls.length).toBe(0);
  });
  it('limits reclassification of existing items to the GM', async () => {
    const p = port(); await expect(executeInventoryCommand(fixture(), form({ operation: 'classify', effect: 'manual' }), p.adapter)).rejects.toThrow('Only the GM'); expect(p.calls.length).toBe(0);
    await executeInventoryCommand(fixture(GM), form({ operation: 'classify', effect: 'manual' }), p.adapter);
    expect(p.calls[0].effect).toBe('manual'); expect(p.calls[0].operation).toBe('classify');
  });
  it('does not report success when the atomic database call fails', async () => {
    await expect(executeInventoryCommand(fixture(), form(), { async act() { throw new Error('Stale database version'); } })).rejects.toThrow('Stale database');
  });
});
