import { describe, expect, it } from 'vitest';
import { nextTurn, orderParticipants, restoreEncounter, type Encounter } from './encounters';

const GAME = '11111111-1111-4111-8111-111111111111';
const FIRST = '22222222-2222-4222-8222-222222222222';
const SECOND = '33333333-3333-4333-8333-333333333333';
const base: Encounter = {
  id: GAME, campaignId: GAME, version: GAME, active: true, round: 3,
  currentParticipantId: FIRST,
  participants: [
    { id: SECOND, kind: 'monster', name: 'Goblin', initiative: 8 },
    { id: FIRST, kind: 'crawler', name: 'Carl', initiative: 12 },
  ],
};

describe('encounter turn rules', () => {
  it('orders by descending initiative with a stable tie break', () => {
    expect(orderParticipants(base.participants).map((p) => p.id)).toEqual([FIRST, SECOND]);
    expect(orderParticipants(base.participants.map((p) => ({ ...p, initiative: 8 }))).map((p) => p.id)).toEqual([FIRST, SECOND]);
  });
  it('advances within a round and wraps only after the last participant', () => {
    expect(nextTurn({ ...base, currentParticipantId: null })).toEqual({ round: 3, currentParticipantId: FIRST, wrapped: false });
    expect(nextTurn(base)).toEqual({ round: 3, currentParticipantId: SECOND, wrapped: false });
    expect(nextTurn({ ...base, currentParticipantId: SECOND })).toEqual({ round: 4, currentParticipantId: FIRST, wrapped: true });
  });
  it('rejects empty, ended, stale-turn, and maximum-round advancement', () => {
    expect(() => nextTurn({ ...base, participants: [] })).toThrow();
    expect(() => nextTurn({ ...base, active: false })).toThrow();
    expect(() => nextTurn({ ...base, currentParticipantId: GAME })).toThrow('out of sync');
    expect(() => nextTurn({ ...base, round: 100000, currentParticipantId: SECOND })).toThrow('limit');
  });
  it('restores storage data and rejects duplicate participants and invalid turns', () => {
    const raw = { id: GAME, campaign_id: GAME, version: GAME, active: true, round: 3, current_participant_id: FIRST, participants: base.participants };
    expect(restoreEncounter(raw).participants.map((p) => p.id)).toEqual([FIRST, SECOND]);
    expect(() => restoreEncounter({ ...raw, participants: [base.participants[0], base.participants[0]] })).toThrow('Duplicate');
    expect(() => restoreEncounter({ ...raw, current_participant_id: GAME })).toThrow('turn');
    expect(restoreEncounter({ ...raw, current_participant_id: null }).currentParticipantId).toBeNull();
  });
});
