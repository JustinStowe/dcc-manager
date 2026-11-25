import { describe, expect, it } from 'vitest';
import { nextTurn, orderParticipants, restoreEncounter, type Encounter } from './encounters';

const GAME = '11111111-1111-4111-8111-111111111111';
const FIRST = '22222222-2222-4222-8222-222222222222';
const SECOND = '33333333-3333-4333-8333-333333333333';
const THIRD = '44444444-4444-4444-8444-444444444444';
const pvp: Encounter = {
  id: GAME, campaignId: GAME, version: GAME, active: true, mode: 'pvp', phase: null,
  round: 3, currentParticipantId: FIRST,
  participants: [
    { id: FIRST, kind: 'crawler', name: 'Carl', initiative: 18 },
    { id: SECOND, kind: 'crawler', name: 'Donut', initiative: 18 },
    { id: THIRD, kind: 'crawler', name: 'Mongo', initiative: 12 },
  ],
};
const mob: Encounter = { ...pvp, mode: 'mob', phase: 'mob-declaration', currentParticipantId: null,
  participants: [{ id: FIRST, kind: 'crawler', name: 'Carl', initiative: null }, { id: THIRD, kind: 'monster', name: 'Goblin', initiative: null }] };

describe('official encounter flow', () => {
  it('steps through Mob phases, wrapping only after Clean up', () => {
    expect(nextTurn(mob)).toEqual({ round: 3, phase: 'crawler-reaction', currentParticipantId: null, wrapped: false });
    expect(nextTurn({ ...mob, phase: 'mob-resolution' }).phase).toBe('crawler-action');
    expect(nextTurn({ ...mob, phase: 'crawler-action' }).phase).toBe('cleanup');
    expect(nextTurn({ ...mob, phase: 'cleanup' })).toEqual({ round: 4, phase: 'mob-declaration', currentParticipantId: null, wrapped: true });
  });
  it('orders PvP totals while treating ties as one acting group', () => {
    expect(orderParticipants([...pvp.participants].reverse()).map((p) => p.id)).toEqual([FIRST, SECOND, THIRD]);
    expect(nextTurn({ ...pvp, currentParticipantId: null })).toEqual({ round: 3, phase: null, currentParticipantId: FIRST, wrapped: false });
    expect(nextTurn(pvp)).toEqual({ round: 3, phase: null, currentParticipantId: THIRD, wrapped: false });
    expect(nextTurn({ ...pvp, currentParticipantId: THIRD })).toEqual({ round: 4, phase: null, currentParticipantId: null, wrapped: true });
  });
  it('requires new PvP totals and respects the round limit', () => {
    expect(() => nextTurn({ ...pvp, participants: pvp.participants.map((p) => ({ ...p, initiative: null })) })).toThrow('fresh');
    expect(() => nextTurn({ ...pvp, currentParticipantId: GAME })).toThrow('out of sync');
    expect(() => nextTurn({ ...mob, round: 100000, phase: 'cleanup' })).toThrow('limit');
    expect(() => nextTurn({ ...mob, active: false })).toThrow();
  });
  it('restores mode, phase and participant data with rule checks', () => {
    const raw = { id: GAME, campaign_id: GAME, version: GAME, active: true, mode: 'mob', phase: 'mob-declaration', round: 3, current_participant_id: null, participants: mob.participants };
    expect(restoreEncounter(raw).participants.map((p) => p.id)).toEqual([FIRST, THIRD]);
    expect(() => restoreEncounter({ ...raw, mode: 'pvp', phase: null })).toThrow('PvP');
    expect(() => restoreEncounter({ ...raw, participants: [mob.participants[0], mob.participants[0]] })).toThrow('Duplicate');
    expect(() => restoreEncounter({ ...raw, current_participant_id: FIRST })).toThrow('phase');
  });
});
