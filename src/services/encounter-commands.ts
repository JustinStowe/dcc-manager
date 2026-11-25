import { getCampaignRole } from '@/domain';
import { encounterInitiative, nextTurn, type Encounter, type EncounterMode } from '@/domain/encounters';
import { getCreature } from '@/domain/creature-catalog';
import { requireUuid, type CampaignWorkspace } from './campaign-workspace';

export type EncounterOperation = 'start' | 'add-crawler' | 'add-monster' | 'assign-creature' | 'monster-health' | 'initiative' | 'remove' | 'next' | 'end';
export interface EncounterWritePort {
  act(input: { campaignId: string; version: string | null; operation: EncounterOperation; participantId?: string; name?: string; initiative?: number; mode?: EncounterMode; catalogId?: string; healthSlots?: number }): Promise<void>;
}

function required(form: FormData, name: string): string {
  const value = form.get(name);
  if (typeof value !== 'string' || !value.trim()) throw new RangeError(`Enter ${name}.`);
  return value.trim();
}

export async function executeEncounterCommand(workspace: CampaignWorkspace, form: FormData, port: EncounterWritePort): Promise<string> {
  const campaign = workspace.campaign;
  if (!campaign || getCampaignRole(campaign, workspace.userId) !== 'gm') throw new Error('Only the campaign GM can manage encounters.');
  const encounter: Encounter | null = workspace.encounter ?? null;
  const operation = required(form, 'operation') as EncounterOperation;
  if (operation === 'start') {
    if (encounter?.active) throw new RangeError('End the current encounter before starting another.');
    const mode = required(form, 'mode');
    if (mode !== 'mob' && mode !== 'pvp') throw new RangeError('Choose a combat mode.');
    await port.act({ campaignId: campaign.id, version: encounter?.version ?? null, operation, mode });
    return 'Encounter started.';
  }
  if (!encounter?.active) throw new RangeError('Start an encounter first.');
  const version = requireUuid(required(form, 'version'));
  if (version !== encounter.version) throw new Error('Encounter changed. Refresh the game before trying again.');
  const base = { campaignId: campaign.id, version };
  if (operation === 'add-crawler') {
    const participantId = requireUuid(required(form, 'participantId'));
    const crawler = campaign.crawlers.find((entry) => entry.crawler.id === participantId);
    if (!crawler || crawler.crawler.ruleset !== 'tutorial-v1') throw new RangeError('Choose an official crawler in this game.');
    if (encounter.participants.some((p) => p.id === participantId)) throw new RangeError('Crawler is already in this encounter.');
    await port.act({ ...base, operation, participantId });
    return 'Crawler added to encounter.';
  }
  if (operation === 'add-monster') {
    if (encounter.mode !== 'mob') throw new RangeError('PvP encounters contain crawlers only.');
    if (encounter.participants.length >= 50) throw new RangeError('Encounter is full.');
    const catalogId = required(form, 'catalogId');
    if (!getCreature(catalogId)) throw new RangeError('Choose a creature from the official catalog.');
    await port.act({ ...base, operation, catalogId });
    return 'Monster added to encounter.';
  }
  if (operation === 'assign-creature' || operation === 'monster-health') {
    const participantId = requireUuid(required(form, 'participantId'));
    const participant = encounter.participants.find((entry) => entry.id === participantId);
    if (!participant || participant.kind !== 'monster') throw new RangeError('Monster is no longer in the encounter.');
    if (operation === 'assign-creature') {
      if (participant.catalogId) throw new RangeError('This monster already has a creature write-up.');
      const catalogId = required(form, 'catalogId');
      if (!getCreature(catalogId)) throw new RangeError('Choose a creature from the official catalog.');
      await port.act({ ...base, operation, participantId, catalogId });
      return 'Creature write-up attached.';
    }
    if (participant.maxHealthSlots === null) throw new RangeError('Attach a creature write-up before tracking health.');
    const healthSlots = Number(required(form, 'healthSlots'));
    if (!Number.isSafeInteger(healthSlots) || healthSlots < 0 || healthSlots > participant.maxHealthSlots) throw new RangeError(`Enter remaining Health Bar slots from 0 to ${participant.maxHealthSlots}.`);
    await port.act({ ...base, operation, participantId, healthSlots });
    return 'Monster health saved.';
  }
  if (operation === 'initiative' || operation === 'remove') {
    if (operation === 'initiative' && encounter.mode !== 'pvp') throw new RangeError('Mob combat does not use initiative.');
    const participantId = requireUuid(required(form, 'participantId'));
    if (!encounter.participants.some((p) => p.id === participantId)) throw new RangeError('Participant is no longer in the encounter.');
    if (operation === 'remove' && form.get('confirmed') !== 'yes') throw new RangeError('Confirm removing this participant.');
    await port.act({ ...base, operation, participantId, ...(operation === 'initiative' ? { initiative: encounterInitiative(Number(required(form, 'initiative'))) } : {}) });
    return operation === 'remove' ? 'Participant removed.' : 'Initiative saved.';
  }
  if (operation === 'next') {
    nextTurn(encounter);
    await port.act({ ...base, operation });
    return encounter.mode === 'mob' ? 'Combat phase advanced.' : 'PvP turn advanced.';
  }
  if (operation === 'end') {
    if (form.get('confirmed') !== 'yes') throw new RangeError('Confirm ending the encounter.');
    await port.act({ ...base, operation });
    return 'Encounter ended.';
  }
  throw new RangeError('Unknown encounter action.');
}
