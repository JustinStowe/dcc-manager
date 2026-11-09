import { describe, expect, it } from 'vitest';
import { addCampaignPlayer, createCampaign, createCampaignCrawler } from '@/domain';
import { executeGameDeletion, executeLobbyCommand, formatGameCode, getGameEntry, normalizeGameCode, type LobbyWritePort } from './game-lobby';

const GM = '11111111-1111-1111-1111-111111111111';
const PLAYER = '22222222-2222-2222-2222-222222222222';
const GAME = '77777777-7777-7777-7777-777777777777';
const CODE = '0123456789ABCDEF0123456789ABCDEF';

function form(values: Record<string, string>) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

function portFixture() {
  const calls: string[] = [];
  const port: LobbyWritePort = {
    async host(name) { calls.push(name); return GAME; },
    async join(code) { calls.push(code); return GAME; },
  };
  return { port, calls };
}

describe('game lobby commands', () => {
  it('hosts using the validated name, with no client-selected GM', async () => {
    const { port, calls } = portFixture();
    const result = await executeLobbyCommand(GM, form({ operation: 'host', name: ' Floor one ', gmUserId: PLAYER }), port);
    expect(result).toEqual({ gameId: GAME, flow: 'host' });
    expect(calls).toEqual(['Floor one']);
  });
  it.each(['', ' ', 'a'.repeat(201)])('rejects invalid host name', async (name) => {
    const { port, calls } = portFixture();
    await expect(executeLobbyCommand(GM, form({ operation: 'host', name }), port)).rejects.toThrow();
    expect(calls.length).toBe(0);
  });
  it('requires the host name field', async () => {
    await expect(executeLobbyCommand(GM, form({ operation: 'host' }), portFixture().port)).rejects.toThrow();
  });
  it('joins using a normalized code', async () => {
    const { port, calls } = portFixture();
    expect(await executeLobbyCommand(PLAYER, form({ operation: 'join', code: '01234567-89abcdef-01234567-89abcdef' }), port)).toEqual({ gameId: GAME, flow: 'join' });
    expect(calls).toEqual([CODE]);
  });
  it('does not claim membership when a code is rejected or joining is paused', async () => {
    const { port } = portFixture();
    port.join = async () => null;
    await expect(executeLobbyCommand(PLAYER, form({ operation: 'join', code: CODE }), port)).rejects.toThrow('Unable to join');
  });
  it('propagates storage failure without returning a destination', async () => {
    const { port } = portFixture();
    port.host = async () => { throw new Error('Storage failed'); };
    await expect(executeLobbyCommand(GM, form({ operation: 'host', name: 'One' }), port)).rejects.toThrow('Storage failed');
  });
  it('rejects a malformed returned game ID', async () => {
    const { port } = portFixture();
    port.join = async () => 'https://other.example';
    await expect(executeLobbyCommand(PLAYER, form({ operation: 'join', code: CODE }), port)).rejects.toThrow();
  });
  it('requires a verified actor ID at the service boundary', async () => {
    const { port, calls } = portFixture();
    await expect(executeLobbyCommand('', form({ operation: 'host', name: 'One' }), port)).rejects.toThrow();
    expect(calls.length).toBe(0);
  });
  it('rejects unrecognized actions', async () => {
    await expect(executeLobbyCommand(GM, form({ operation: 'become-gm' }), portFixture().port)).rejects.toThrow();
  });
});

describe('game deletion', () => {
  it('passes the exact confirmation name to the authoritative database check', async () => {
    const calls: string[][] = [];
    await executeGameDeletion(GM, form({ gameId: GAME, confirmationName: 'Floor one', confirmed: 'yes' }), {
      async deleteGame(...values) { calls.push(values); },
    });
    expect(calls).toEqual([[GAME, 'Floor one']]);
  });
  it.each([
    { gameId: GAME, confirmationName: 'Floor one', confirmed: '' },
    { gameId: GAME, confirmationName: '', confirmed: 'yes' },
    { gameId: 'invalid', confirmationName: 'Floor one', confirmed: 'yes' },
  ])('rejects incomplete or malformed deletion requests', async (values) => {
    let called = false;
    await expect(executeGameDeletion(GM, form(values), { async deleteGame() { called = true; } })).rejects.toThrow();
    expect(called).toBe(false);
  });
});

describe('game codes', () => {
  it('formats codes into copyable groups', () => {
    expect(formatGameCode(CODE)).toBe('01234567-89ABCDEF-01234567-89ABCDEF');
  });
  it('normalizes case, spacing, and grouping', () => {
    expect(normalizeGameCode(' 01234567 89abcdef-01234567-89abcdef ')).toBe(CODE);
  });
  it.each(['', 'abc', '0'.repeat(31), '0'.repeat(33), 'Z'.repeat(32)])('rejects malformed code', (code) => {
    expect(() => normalizeGameCode(code)).toThrow(RangeError);
  });
});

describe('game entry routing', () => {
  const base = createCampaign({ id: GAME, name: 'One', gmUserId: GM });
  const withPlayer = addCampaignPlayer(base, GM, PLAYER);
  it('takes the owner to the GM dashboard', () => {
    expect(getGameEntry({ userId: GM, campaign: withPlayer, versions: {} })).toBe('gm');
  });
  it('takes a new member to creation', () => {
    expect(getGameEntry({ userId: PLAYER, campaign: withPlayer, versions: {} })).toBe('create');
  });
  it('takes an existing member straight to their saved sheet', () => {
    const campaign = createCampaignCrawler(withPlayer, PLAYER, { id: 'crawler', ownerUserId: PLAYER, name: 'Carl', baseSegments: 10, constitution: 10 });
    expect(getGameEntry({ userId: PLAYER, campaign, versions: {} })).toBe('sheet');
  });
  it('does not grant global GM privileges to a host joining another game', () => {
    const other = addCampaignPlayer(createCampaign({ id: 'other', name: 'Two', gmUserId: PLAYER }), PLAYER, GM);
    expect(getGameEntry({ userId: GM, campaign: other, versions: {} })).toBe('create');
  });
  it('does not use another player crawler to skip creation', () => {
    const campaign = createCampaignCrawler(withPlayer, GM, { id: 'gm-crawler', ownerUserId: GM, name: 'GM', baseSegments: 10, constitution: 10 });
    expect(getGameEntry({ userId: PLAYER, campaign, versions: {} })).toBe('create');
  });
  it('rejects an inaccessible campaign', () => {
    expect(getGameEntry({ userId: PLAYER, campaign: base, versions: {} })).toBe('unavailable');
  });
  it('rejects an absent campaign', () => {
    expect(getGameEntry({ userId: PLAYER, campaign: null, versions: {} })).toBe('unavailable');
  });
});
