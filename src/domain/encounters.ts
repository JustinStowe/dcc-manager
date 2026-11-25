export interface EncounterParticipant {
  readonly id: string;
  readonly kind: 'crawler' | 'monster';
  readonly name: string;
  readonly initiative: number;
}

export interface Encounter {
  readonly id: string;
  readonly campaignId: string;
  readonly version: string;
  readonly active: boolean;
  readonly round: number;
  readonly currentParticipantId: string | null;
  readonly participants: readonly EncounterParticipant[];
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid encounter data.');
  return value as Record<string, unknown>;
};
const asUuid = (value: unknown): string => {
  if (typeof value !== 'string' || !uuid.test(value)) throw new Error('Invalid encounter ID.');
  return value.toLowerCase();
};

export function encounterInitiative(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < -1000 || (value as number) > 1000) {
    throw new RangeError('Initiative must be a whole number from -1000 to 1000.');
  }
  return value as number;
}

export function encounterName(value: unknown, maximum = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) {
    throw new RangeError(`Enter a participant name of 1 to ${maximum} characters.`);
  }
  return value.trim();
}

export function orderParticipants(participants: readonly EncounterParticipant[]): EncounterParticipant[] {
  return [...participants].sort((a, b) => b.initiative - a.initiative || a.id.localeCompare(b.id));
}

export function nextTurn(encounter: Encounter): { round: number; currentParticipantId: string; wrapped: boolean } {
  if (!encounter.active || !encounter.participants.length) throw new RangeError('Add a participant before advancing the turn.');
  const ordered = orderParticipants(encounter.participants);
  if (encounter.currentParticipantId === null) return { round: encounter.round, currentParticipantId: ordered[0].id, wrapped: false };
  const current = ordered.findIndex((entry) => entry.id === encounter.currentParticipantId);
  if (current < 0) throw new Error('Encounter turn is out of sync. Refresh the game.');
  const wrapped = current === ordered.length - 1;
  if (wrapped && encounter.round >= 100000) throw new RangeError('Encounter round limit reached.');
  return { round: encounter.round + (wrapped ? 1 : 0), currentParticipantId: ordered[(current + 1) % ordered.length].id, wrapped };
}

export function restoreEncounter(value: unknown): Encounter {
  const row = asRecord(value);
  const participants = row.participants;
  if (!Array.isArray(participants) || participants.length > 50) throw new Error('Invalid encounter participants.');
  const restored: EncounterParticipant[] = participants.map((value) => {
    const p = asRecord(value);
    if (p.kind !== 'crawler' && p.kind !== 'monster') throw new Error('Invalid encounter participant kind.');
    return { id: asUuid(p.id), kind: p.kind, name: encounterName(p.name), initiative: encounterInitiative(p.initiative) };
  });
  if (new Set(restored.map((p) => p.id)).size !== restored.length) throw new Error('Duplicate encounter participant.');
  const currentParticipantId = row.current_participant_id === null ? null : asUuid(row.current_participant_id);
  if (currentParticipantId && !restored.some((p) => p.id === currentParticipantId)) throw new Error('Invalid encounter turn.');
  if (restored.length === 0 && currentParticipantId !== null) throw new Error('Invalid encounter turn.');
  if (!Number.isSafeInteger(row.round) || (row.round as number) < 1 || (row.round as number) > 100000) throw new Error('Invalid encounter round.');
  if (typeof row.active !== 'boolean') throw new Error('Invalid encounter status.');
  return {
    id: asUuid(row.id), campaignId: asUuid(row.campaign_id), version: asUuid(row.version),
    active: row.active, round: row.round as number, currentParticipantId,
    participants: orderParticipants(restored),
  };
}
