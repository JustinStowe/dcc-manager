import { getCampaignRole } from '@/domain';
import { encounterInitiative, encounterName, nextTurn, type Encounter } from '@/domain/encounters';
import { requireUuid, type CampaignWorkspace } from './campaign-workspace';

export type EncounterOperation = 'start' | 'add-crawler' | 'add-monster' | 'initiative' | 'remove' | 'next' | 'end';
export interface EncounterWritePort {
  act(input: { campaignId: string; version: string | null; operation: EncounterOperation; participantId?: string; name?: string; initiative?: number }): Promise<void>;
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
    await port.act({ campaignId: campaign.id, version: encounter?.version ?? null, operation });
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
    await port.act({ ...base, operation, participantId, initiative: encounterInitiative(Number(required(form, 'initiative'))) });
    return 'Crawler added to encounter.';
  }
  if (operation === 'add-monster') {
    if (encounter.participants.length >= 50) throw new RangeError('Encounter is full.');
    await port.act({ ...base, operation, name: encounterName(required(form, 'name'), 100), initiative: encounterInitiative(Number(required(form, 'initiative'))) });
    return 'Monster added to encounter.';
  }
  if (operation === 'initiative' || operation === 'remove') {
    const participantId = requireUuid(required(form, 'participantId'));
    if (!encounter.participants.some((p) => p.id === participantId)) throw new RangeError('Participant is no longer in the encounter.');
    if (operation === 'remove' && form.get('confirmed') !== 'yes') throw new RangeError('Confirm removing this participant.');
    await port.act({ ...base, operation, participantId, ...(operation === 'initiative' ? { initiative: encounterInitiative(Number(required(form, 'initiative'))) } : {}) });
    return operation === 'remove' ? 'Participant removed.' : 'Initiative saved.';
  }
  if (operation === 'next') {
    nextTurn(encounter);
    await port.act({ ...base, operation });
    return 'Turn advanced.';
  }
  if (operation === 'end') {
    if (form.get('confirmed') !== 'yes') throw new RangeError('Confirm ending the encounter.');
    await port.act({ ...base, operation });
    return 'Encounter ended.';
  }
  throw new RangeError('Unknown encounter action.');
}
