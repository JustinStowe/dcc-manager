export interface EncounterParticipant {
  readonly id: string;
  readonly kind: 'crawler' | 'monster';
  readonly name: string;
  readonly initiative: number | null;
  readonly catalogId: string | null;
  readonly maxHealthSlots: number | null;
  readonly currentHealthSlots: number | null;
}

export type EncounterMode = 'mob' | 'pvp';
export const MOB_PHASES = ['mob-declaration', 'crawler-reaction', 'mob-resolution', 'crawler-action', 'cleanup'] as const;
export type MobPhase = typeof MOB_PHASES[number];

export interface Encounter {
  readonly id: string;
  readonly campaignId: string;
  readonly version: string;
  readonly active: boolean;
  readonly mode: EncounterMode;
  readonly phase: MobPhase | null;
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
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 10020) {
    throw new RangeError('Enter a d20 + Dex total from 1 to 10020.');
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
  return [...participants].sort((a, b) => (b.initiative ?? -1) - (a.initiative ?? -1) || a.id.localeCompare(b.id));
}

export function nextTurn(encounter: Encounter): { round: number; currentParticipantId: string | null; phase: MobPhase | null; wrapped: boolean } {
  if (!encounter.active || !encounter.participants.length) throw new RangeError('Add a participant before advancing the turn.');
  if (encounter.mode === 'mob') {
    if (encounter.phase === null) throw new Error('Encounter phase is out of sync. Refresh the game.');
    const index = MOB_PHASES.indexOf(encounter.phase);
    const wrapped = index === MOB_PHASES.length - 1;
    if (wrapped && encounter.round >= 100000) throw new RangeError('Encounter round limit reached.');
    return { round: encounter.round + (wrapped ? 1 : 0), currentParticipantId: null, phase: MOB_PHASES[(index + 1) % MOB_PHASES.length], wrapped };
  }
  const ordered = orderParticipants(encounter.participants);
  if (ordered.some((p) => p.initiative === null)) throw new RangeError('Record a fresh d20 + Dex total for every crawler this round.');
  if (encounter.currentParticipantId === null) return { round: encounter.round, currentParticipantId: ordered[0].id, phase: null, wrapped: false };
  const current = ordered.findIndex((entry) => entry.id === encounter.currentParticipantId);
  if (current < 0) throw new Error('Encounter turn is out of sync. Refresh the game.');
  const next = ordered.find((entry) => entry.initiative! < ordered[current].initiative!);
  const wrapped = !next;
  if (wrapped && encounter.round >= 100000) throw new RangeError('Encounter round limit reached.');
  return { round: encounter.round + (wrapped ? 1 : 0), currentParticipantId: next?.id ?? null, phase: null, wrapped };
}

export function restoreEncounter(value: unknown): Encounter {
  const row = asRecord(value);
  const participants = row.participants;
  if (!Array.isArray(participants) || participants.length > 50) throw new Error('Invalid encounter participants.');
  const restored: EncounterParticipant[] = participants.map((value) => {
    const p = asRecord(value);
    if (p.kind !== 'crawler' && p.kind !== 'monster') throw new Error('Invalid encounter participant kind.');
    const catalogId = p.catalogId === undefined || p.catalogId === null ? null : p.catalogId;
    if (catalogId !== null && (p.kind !== 'monster' || typeof catalogId !== 'string' || !/^(core|toolkit|par)-\d+-\d+$/.test(catalogId))) throw new Error('Invalid encounter creature.');
    const maxHealthSlots = p.maxHealthSlots === undefined || p.maxHealthSlots === null ? null : p.maxHealthSlots;
    const currentHealthSlots = p.currentHealthSlots === undefined || p.currentHealthSlots === null ? null : p.currentHealthSlots;
    if (catalogId === null ? (maxHealthSlots !== null || currentHealthSlots !== null) :
      (!Number.isSafeInteger(maxHealthSlots) || (maxHealthSlots as number) < 1 || (maxHealthSlots as number) > 100 ||
       !Number.isSafeInteger(currentHealthSlots) || (currentHealthSlots as number) < 0 || (currentHealthSlots as number) > (maxHealthSlots as number))) {
      throw new Error('Invalid encounter creature health.');
    }
    return { id: asUuid(p.id), kind: p.kind, name: encounterName(p.name), initiative: p.initiative === null ? null : encounterInitiative(p.initiative),
      catalogId: catalogId as string | null, maxHealthSlots: maxHealthSlots as number | null, currentHealthSlots: currentHealthSlots as number | null };
  });
  if (new Set(restored.map((p) => p.id)).size !== restored.length) throw new Error('Duplicate encounter participant.');
  const currentParticipantId = row.current_participant_id === null ? null : asUuid(row.current_participant_id);
  if (currentParticipantId && !restored.some((p) => p.id === currentParticipantId)) throw new Error('Invalid encounter turn.');
  if (restored.length === 0 && currentParticipantId !== null) throw new Error('Invalid encounter turn.');
  if (!Number.isSafeInteger(row.round) || (row.round as number) < 1 || (row.round as number) > 100000) throw new Error('Invalid encounter round.');
  if (typeof row.active !== 'boolean') throw new Error('Invalid encounter status.');
  if (row.mode !== 'mob' && row.mode !== 'pvp') throw new Error('Invalid encounter mode.');
  const mode = row.mode;
  const phase = row.phase;
  if (mode === 'mob' && (!MOB_PHASES.includes(phase as MobPhase) || currentParticipantId !== null || restored.some((p) => p.initiative !== null))) throw new Error('Invalid Mob combat phase.');
  if (mode === 'pvp' && (phase !== null || restored.some((p) => p.kind !== 'crawler'))) throw new Error('Invalid PvP encounter.');
  return {
    id: asUuid(row.id), campaignId: asUuid(row.campaign_id), version: asUuid(row.version),
    active: row.active, mode, phase: phase as MobPhase | null, round: row.round as number, currentParticipantId,
    participants: mode === 'pvp' ? orderParticipants(restored) : restored,
  };
}
