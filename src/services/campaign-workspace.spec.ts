import { describe, expect, it } from 'vitest';
import { addCampaignPlayer, createCampaign, createCampaignCrawler, getVisibleCampaignCrawlers } from '@/domain';
import { executeCampaignCommand, requireUuid, type CampaignWorkspace, type CampaignWritePort } from './campaign-workspace';

const GM = '11111111-1111-1111-1111-111111111111';
const ALICE = '22222222-2222-2222-2222-222222222222';
const BOB = '33333333-3333-3333-3333-333333333333';
const CHARLIE = '44444444-4444-4444-4444-444444444444';
const C1 = '55555555-5555-5555-5555-555555555555';
const C2 = '66666666-6666-6666-6666-666666666666';
const VERSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function fixture(userId = ALICE, populated = true): CampaignWorkspace {
  let campaign = createCampaign({ id: '77777777-7777-7777-7777-777777777777', name: 'Floor one', gmUserId: GM });
  campaign = addCampaignPlayer(campaign, GM, ALICE);
  campaign = addCampaignPlayer(campaign, GM, BOB);
  if (populated) {
    campaign = createCampaignCrawler(campaign, ALICE, { id: C1, ownerUserId: ALICE, name: 'Carl', baseSegments: 10, constitution: 10 });
    campaign = createCampaignCrawler(campaign, BOB, { id: C2, ownerUserId: BOB, name: 'Donut', baseSegments: 10, constitution: 10 });
  }
  const crawlers = getVisibleCampaignCrawlers(campaign, userId);
  return { userId, campaign: { ...campaign, crawlers }, versions: Object.fromEntries(crawlers.map((entry) => [entry.crawler.id, VERSION])) };
}

function makePort() {
  const calls: unknown[] = [];
  const port: CampaignWritePort = {
    async addPlayer(...args) { calls.push(['add', ...args]); },
    async createCrawler(input) { calls.push(['create', input]); },
    async changeHealth(...args) { calls.push(['health', ...args]); },
    async updateStats(...args) { calls.push(['stats', ...args]); },
  };
  return { port, calls };
}

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const health = { operation: 'health', crawlerId: C1, version: VERSION, amount: '3', direction: 'damage' };
const creation = { operation: 'create', ownerUserId: ALICE, name: 'Carl', baseSegments: '10', constitution: '14' };
const stats = { operation: 'stats', crawlerId: C1, version: VERSION, baseSegments: '20', constitution: '14' };

describe('campaign application commands', () => {
  it('rejects actions without campaign membership', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand({ userId: ALICE, campaign: null, versions: {} }, form(health), port)).rejects.toThrow('Ask the GM');
    expect(calls.length).toBe(0);
  });

  it.each([ALICE, GM])('allows owner or GM damage with the version token', async (actor) => {
    const { port, calls } = makePort();
    await executeCampaignCommand(fixture(actor), form(health), port);
    expect(calls).toEqual([['health', C1, VERSION, -3]]);
  });

  it('sends healing as a positive delta', async () => {
    const { port, calls } = makePort();
    await executeCampaignCommand(fixture(), form({ ...health, direction: 'heal' }), port);
    expect(calls).toEqual([['health', C1, VERSION, 3]]);
  });

  it('prevents another player from changing health', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand(fixture(BOB), form(health), port)).rejects.toThrow();
    expect(calls.length).toBe(0);
  });

  it.each(['', '0', '-1', '1.5', 'NaN', '9007199254740992'])(
    'rejects invalid health amount %s without saving', async (amount) => {
      const { port, calls } = makePort();
      await expect(executeCampaignCommand(fixture(), form({ ...health, amount }), port)).rejects.toThrow();
      expect(calls.length).toBe(0);
    },
  );

  it('rejects an unsupported health action', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand(fixture(), form({ ...health, direction: 'set-full' }), port)).rejects.toThrow();
    expect(calls.length).toBe(0);
  });

  it('rejects a stale form before saving', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand(fixture(), form({ ...health, version: CHARLIE }), port)).rejects.toThrow('Crawler changed');
    expect(calls.length).toBe(0);
  });

  it('propagates a database conflict without claiming success', async () => {
    const { port } = makePort();
    port.changeHealth = async () => { throw new Error('Database conflict'); };
    await expect(executeCampaignCommand(fixture(), form(health), port)).rejects.toThrow('Database conflict');
  });

  it('lets the GM update stats', async () => {
    const { port, calls } = makePort();
    await executeCampaignCommand(fixture(GM), form(stats), port);
    expect(calls).toEqual([['stats', C1, VERSION, 20, 14]]);
  });

  it('prevents the owner from updating protected stats', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand(fixture(), form(stats), port)).rejects.toThrow();
    expect(calls.length).toBe(0);
  });

  it('rejects invalid GM stats before saving', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand(fixture(GM), form({ ...stats, baseSegments: '0' }), port)).rejects.toThrow();
    expect(calls.length).toBe(0);
  });

  it('lets the GM add a player', async () => {
    const { port, calls } = makePort();
    const workspace = fixture(GM);
    await executeCampaignCommand(workspace, form({ operation: 'add-player', userId: CHARLIE }), port);
    expect(calls).toEqual([['add', workspace.campaign?.id, CHARLIE]]);
  });

  it('prevents a player adding themselves or others as members', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand(fixture(), form({ operation: 'add-player', userId: CHARLIE }), port)).rejects.toThrow();
    expect(calls.length).toBe(0);
  });

  it('rejects duplicate membership before saving', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand(fixture(GM), form({ operation: 'add-player', userId: ALICE }), port)).rejects.toThrow();
    expect(calls.length).toBe(0);
  });

  it('creates an owned crawler at validated maximum health', async () => {
    const { port, calls } = makePort();
    const workspace = fixture(ALICE, false);
    await executeCampaignCommand(workspace, form(creation), port);
    expect(calls).toEqual([['create', { campaignId: workspace.campaign?.id, ownerUserId: ALICE, name: 'Carl', baseSegments: 10, constitution: 14, currentSegments: 12 }]]);
  });

  it('prevents a player assigning a crawler to someone else', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand(fixture(ALICE, false), form({ ...creation, ownerUserId: BOB }), port)).rejects.toThrow();
    expect(calls.length).toBe(0);
  });

  it('lets the GM create a crawler for a member', async () => {
    const { port, calls } = makePort();
    await executeCampaignCommand(fixture(GM, false), form({ ...creation, ownerUserId: BOB }), port);
    expect(calls.length).toBe(1);
  });

  it('rejects creating a second crawler for the same account', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand(fixture(), form(creation), port)).rejects.toThrow('already has');
    expect(calls.length).toBe(0);
  });

  it('rejects blank creation stats instead of treating them as zero', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand(fixture(ALICE, false), form({ ...creation, constitution: ' ' }), port)).rejects.toThrow();
    expect(calls.length).toBe(0);
  });

  it('rejects browser imports even with a valid saved snapshot', async () => {
    const { port, calls } = makePort();
    const workspace = fixture(ALICE, false);
    const snapshot = JSON.stringify({ id: 'legacy', campaignId: 'local-preview', name: 'Carl', baseSegments: 10, constitution: 10, currentSegments: 0 });
    await expect(executeCampaignCommand(workspace, form({ operation: 'import', snapshot, ownerUserId: BOB }), port)).rejects.toThrow('Unknown campaign action');
    expect(calls.length).toBe(0);
  });

  it('rejects malformed browser imports without saving', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand(fixture(ALICE, false), form({ operation: 'import', snapshot: '{}' }), port)).rejects.toThrow();
    expect(calls.length).toBe(0);
  });

  it('rejects unknown commands', async () => {
    const { port, calls } = makePort();
    await expect(executeCampaignCommand(fixture(), form({ operation: 'delete' }), port)).rejects.toThrow('Unknown');
    expect(calls.length).toBe(0);
  });

  it('rejects malformed account IDs', () => {
    expect(() => requireUuid('not-an-id')).toThrow(RangeError);
  });
});
