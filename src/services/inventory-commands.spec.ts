import { describe, expect, it } from 'vitest';
import { addCampaignPlayer, createCampaign } from '@/domain';
import { createCrawler } from '@/domain/crawler';
import type { InventoryItem } from '@/domain/inventory';
import type { CampaignWorkspace } from './campaign-workspace';
import { executeInventoryCommand, type InventoryPort, type InventoryWrite } from './inventory-commands';

const GM = '11111111-1111-1111-1111-111111111111', PLAYER = '22222222-2222-2222-2222-222222222222';
const OTHER = '33333333-3333-3333-3333-333333333333', GAME = '77777777-7777-7777-7777-777777777777';
const ID = '55555555-5555-5555-5555-555555555555', VERSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ITEM = '66666666-6666-4666-8666-666666666666';
const potion: InventoryItem = { id: ITEM, name: 'Potion', quantity: 2, kind: 'consumable', gearSlot: 'none', location: 'stored', notes: '' };
function fixture(userId = PLAYER): CampaignWorkspace {
  const campaign = addCampaignPlayer(addCampaignPlayer(createCampaign({ id: GAME, name: 'Game', gmUserId: GM }), GM, PLAYER), GM, OTHER);
  const crawler = createCrawler({ id: ID, campaignId: GAME, name: 'Carl', baseSegments: 10, constitution: 3, ruleset: 'tutorial-v1' });
  return { userId, campaign: { ...campaign, crawlers: [{ ownerUserId: PLAYER, crawler }] }, versions: { [ID]: VERSION }, inventories: { [ID]: [potion] } };
}
function form(extra: Record<string, string> = {}): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries({ operation: 'add', crawlerId: ID, version: VERSION, name: 'Sword', quantity: '1', kind: 'weapon', gearSlot: 'holding', notes: '', ...extra })) data.set(key, value);
  return data;
}
function port() { const calls: InventoryWrite[] = []; return { calls, adapter: { async act(input: InventoryWrite) { calls.push(input); } } satisfies InventoryPort }; }
describe('Inventory application permissions', () => {
  it.each([PLAYER, GM])('allows an owner or the GM to add items: %s', async (userId) => {
    const p = port(); await executeInventoryCommand(fixture(userId), form(), p.adapter);
    expect(p.calls.length).toBe(1); expect(p.calls[0].itemId).toBe(null); expect(p.calls[0].version).toBe(VERSION);
  });
  it('rejects another player before writing', async () => {
    const p = port(); await expect(executeInventoryCommand(fixture(OTHER), form(), p.adapter)).rejects.toThrow('permission'); expect(p.calls.length).toBe(0);
  });
  it('rejects a missing game', async () => {
    const p = port(); await expect(executeInventoryCommand({ ...fixture(), campaign: null }, form(), p.adapter)).rejects.toThrow('no longer'); expect(p.calls.length).toBe(0);
  });
  it('rejects stale versions', async () => {
    const p = port(); await expect(executeInventoryCommand(fixture(), form({ version: OTHER }), p.adapter)).rejects.toThrow('changed'); expect(p.calls.length).toBe(0);
  });
  it('fails closed on missing inventory data', async () => {
    const p = port(); await expect(executeInventoryCommand({ ...fixture(), inventories: undefined }, form(), p.adapter)).rejects.toThrow('loaded'); expect(p.calls.length).toBe(0);
  });
  it('rejects prototype inventory writes', async () => {
    const w = fixture(); const entry = w.campaign!.crawlers[0];
    const workspace = { ...w, campaign: { ...w.campaign!, crawlers: [{ ...entry, crawler: { ...entry.crawler, ruleset: 'prototype' as const } }] } };
    const p = port(); await expect(executeInventoryCommand(workspace, form(), p.adapter)).rejects.toThrow('convert'); expect(p.calls.length).toBe(0);
  });
  it.each(['0', '-1', '1.5', 'Infinity'])('rejects invalid quantity %s', async (quantity) => {
    const p = port(); await expect(executeInventoryCommand(fixture(), form({ quantity }), p.adapter)).rejects.toThrow(); expect(p.calls.length).toBe(0);
  });
  it('requires confirmation for consuming and removing items', async () => {
    const p = port();
    for (const operation of ['consume', 'remove']) await expect(executeInventoryCommand(fixture(), form({ operation, itemId: ITEM }), p.adapter)).rejects.toThrow('Confirm');
    expect(p.calls.length).toBe(0);
  });
  it('consumes only the selected game item without accepting supplied resource changes', async () => {
    const p = port(); await executeInventoryCommand(fixture(), form({ operation: 'consume', itemId: ITEM, confirmed: 'yes', mana: '9999' }), p.adapter);
    expect(p.calls[0]).toEqual({ crawlerId: ID, version: VERSION, operation: 'consume', itemId: ITEM, item: null, location: null });
  });
  it('rejects mismatched equipment locations before writing', async () => {
    const p = port(); await expect(executeInventoryCommand(fixture(), form({ operation: 'equip', itemId: ITEM, location: 'head' }), p.adapter)).rejects.toThrow('cannot'); expect(p.calls.length).toBe(0);
  });
  it('rejects unknown actions and malformed item IDs', async () => {
    const p = port();
    await expect(executeInventoryCommand(fixture(), form({ operation: 'award-stats' }), p.adapter)).rejects.toThrow();
    await expect(executeInventoryCommand(fixture(), form({ operation: 'remove', itemId: 'invalid', confirmed: 'yes' }), p.adapter)).rejects.toThrow();
    expect(p.calls.length).toBe(0);
  });
  it('does not claim success if the database rejects a concurrent update', async () => {
    const adapter: InventoryPort = { async act() { throw new Error('Concurrent update'); } };
    await expect(executeInventoryCommand(fixture(), form(), adapter)).rejects.toThrow('Concurrent');
  });
});
