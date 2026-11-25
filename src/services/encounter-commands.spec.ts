import { describe, expect, it, vi } from 'vitest';
import { executeEncounterCommand, type EncounterWritePort } from './encounter-commands';
import type { CampaignWorkspace } from './campaign-workspace';
import type { Encounter } from '@/domain/encounters';

const GM = '11111111-1111-4111-8111-111111111111';
const PLAYER = '22222222-2222-4222-8222-222222222222';
const GAME = '33333333-3333-4333-8333-333333333333';
const CRAWLER = '44444444-4444-4444-8444-444444444444';
const VERSION = '55555555-5555-4555-8555-555555555555';
const encounter: Encounter = { id: GAME, campaignId: GAME, version: VERSION, active: true, mode: 'mob', phase: 'mob-declaration', round: 1, currentParticipantId: null, participants: [] };
const campaign: NonNullable<CampaignWorkspace['campaign']> = {
  id: GAME, name: 'Game', gmUserId: GM, playerUserIds: [PLAYER],
  crawlers: [{ ownerUserId: PLAYER, crawler: { id: CRAWLER, campaignId: GAME, name: 'Carl', baseSegments: 10, constitution: 5, currentSegments: 10, ruleset: 'tutorial-v1' } }],
};
function workspace(userId = GM, current: Encounter | null = encounter): CampaignWorkspace { return { userId, campaign, versions: {}, encounter: current }; }
function form(operation: string, fields: Record<string, string> = {}): FormData {
  const f = new FormData(); f.set('operation', operation); f.set('version', VERSION);
  for (const [key, value] of Object.entries(fields)) f.set(key, value);
  return f;
}
function port() { return { act: vi.fn(async () => {}) } satisfies EncounterWritePort; }

describe('encounter commands', () => {
  it('requires the GM, an active encounter and its current version', async () => {
    const p = port();
    await expect(executeEncounterCommand(workspace(PLAYER), form('next'), p)).rejects.toThrow('GM');
    await expect(executeEncounterCommand(workspace(GM, null), form('next'), p)).rejects.toThrow('Start');
    await expect(executeEncounterCommand(workspace(), form('end', { version: GAME }), p)).rejects.toThrow('changed');
    expect(p.act).not.toHaveBeenCalled();
  });
  it('starts a selected flow and rejects a second active encounter', async () => {
    const p = port();
    await executeEncounterCommand(workspace(GM, null), form('start', { mode: 'pvp' }), p);
    expect(p.act).toHaveBeenCalledWith({ campaignId: GAME, version: null, operation: 'start', mode: 'pvp' });
    await expect(executeEncounterCommand(workspace(), form('start', { mode: 'mob' }), p)).rejects.toThrow('End');
  });
  it('adds Mob participants without assigning initiative', async () => {
    const p = port();
    await executeEncounterCommand(workspace(), form('add-crawler', { participantId: CRAWLER }), p);
    await executeEncounterCommand(workspace(), form('add-monster', { name: 'Goblin' }), p);
    expect(p.act).toHaveBeenNthCalledWith(1, { campaignId: GAME, version: VERSION, operation: 'add-crawler', participantId: CRAWLER });
    expect(p.act).toHaveBeenNthCalledWith(2, { campaignId: GAME, version: VERSION, operation: 'add-monster', name: 'Goblin' });
    await expect(executeEncounterCommand(workspace(), form('initiative', { participantId: CRAWLER, initiative: '12' }), p)).rejects.toThrow('does not use initiative');
  });
  it('restricts PvP to crawlers and validates the recorded total', async () => {
    const p = port();
    const current: Encounter = { ...encounter, mode: 'pvp', phase: null, participants: [{ id: CRAWLER, kind: 'crawler', name: 'Carl', initiative: null }] };
    await expect(executeEncounterCommand(workspace(GM, current), form('add-monster', { name: 'Goblin' }), p)).rejects.toThrow('crawlers only');
    await expect(executeEncounterCommand(workspace(GM, current), form('next'), p)).rejects.toThrow('fresh');
    await executeEncounterCommand(workspace(GM, current), form('initiative', { participantId: CRAWLER, initiative: '17' }), p);
    expect(p.act).toHaveBeenCalledWith({ campaignId: GAME, version: VERSION, operation: 'initiative', participantId: CRAWLER, initiative: 17 });
  });
  it('requires confirmation for removal and ending', async () => {
    const p = port();
    const current: Encounter = { ...encounter, participants: [{ id: CRAWLER, kind: 'crawler', name: 'Carl', initiative: null }] };
    await expect(executeEncounterCommand(workspace(GM, current), form('remove', { participantId: CRAWLER }), p)).rejects.toThrow('Confirm');
    await expect(executeEncounterCommand(workspace(), form('end'), p)).rejects.toThrow('Confirm');
    await executeEncounterCommand(workspace(GM, current), form('next'), p);
    expect(p.act).toHaveBeenCalledWith({ campaignId: GAME, version: VERSION, operation: 'next' });
  });
});
