import { describe, expect, it, vi } from 'vitest';
import { executeEncounterCommand, type EncounterWritePort } from './encounter-commands';
import type { CampaignWorkspace } from './campaign-workspace';
import type { Encounter } from '@/domain/encounters';

const GM = '11111111-1111-4111-8111-111111111111';
const PLAYER = '22222222-2222-4222-8222-222222222222';
const GAME = '33333333-3333-4333-8333-333333333333';
const CRAWLER = '44444444-4444-4444-8444-444444444444';
const VERSION = '55555555-5555-4555-8555-555555555555';
const encounter: Encounter = { id: GAME, campaignId: GAME, version: VERSION, active: true, round: 1, currentParticipantId: null, participants: [] };
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
  it('requires a GM and an active, current encounter for writes', async () => {
    const p = port();
    await expect(executeEncounterCommand(workspace(PLAYER), form('next'), p)).rejects.toThrow('GM');
    await expect(executeEncounterCommand(workspace(GM, null), form('next'), p)).rejects.toThrow('Start');
    await expect(executeEncounterCommand(workspace(), form('end', { version: GAME }), p)).rejects.toThrow('changed');
    expect(p.act).not.toHaveBeenCalled();
  });
  it('validates crawler membership, initiative and duplicate entry', async () => {
    const p = port();
    await executeEncounterCommand(workspace(), form('add-crawler', { participantId: CRAWLER, initiative: '12' }), p);
    expect(p.act).toHaveBeenCalledWith({ campaignId: GAME, version: VERSION, operation: 'add-crawler', participantId: CRAWLER, initiative: 12 });
    await expect(executeEncounterCommand(workspace(), form('add-crawler', { participantId: GAME, initiative: '12' }), p)).rejects.toThrow('official crawler');
    await expect(executeEncounterCommand(workspace(), form('add-monster', { name: 'Goblin', initiative: '1001' }), p)).rejects.toThrow('Initiative');
    expect(p.act).toHaveBeenCalledTimes(1);
  });
  it('requires explicit confirmation to end and remove', async () => {
    const p = port();
    await expect(executeEncounterCommand(workspace(), form('end'), p)).rejects.toThrow('Confirm');
    const occupied = { ...encounter, currentParticipantId: CRAWLER, participants: [{ id: CRAWLER, kind: 'crawler' as const, name: 'Carl', initiative: 12 }] };
    await expect(executeEncounterCommand(workspace(GM, occupied), form('remove', { participantId: CRAWLER }), p)).rejects.toThrow('Confirm');
    await executeEncounterCommand(workspace(GM, occupied), form('next'), p);
    expect(p.act).toHaveBeenCalledWith({ campaignId: GAME, version: VERSION, operation: 'next' });
  });
  it('starts only when no active encounter exists', async () => {
    const p = port();
    await executeEncounterCommand(workspace(GM, null), form('start'), p);
    expect(p.act).toHaveBeenCalledWith({ campaignId: GAME, version: null, operation: 'start' });
    await expect(executeEncounterCommand(workspace(), form('start'), p)).rejects.toThrow('End');
  });
});
