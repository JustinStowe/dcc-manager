import entries from './creature-catalog.json';

export interface Creature {
  readonly id: string;
  readonly name: string;
  readonly classification: string;
  readonly healthSlots: number;
  readonly level: number;
  readonly surprise: string;
  readonly evade: string;
  readonly move: string;
  readonly dr: string;
  readonly stats: string;
  readonly details: string;
  readonly source: string;
  readonly pdfPage: number;
}

export const creatures: readonly Creature[] = entries;
const byId = new Map(creatures.map((creature) => [creature.id, creature]));

export function getCreature(id: string | null): Creature | null {
  return id ? byId.get(id) ?? null : null;
}
