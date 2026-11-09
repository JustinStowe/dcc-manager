import { createTutorialProfile, type TutorialDraft, type TutorialProfile } from '@/domain/tutorial';
import { requireUuid } from './campaign-workspace';

export interface SavedCrawlerProfile {
  readonly slot: number;
  readonly name: string;
  readonly profile: TutorialProfile;
  readonly rollId: string | null;
  readonly version: string;
}
export interface CrawlerProfilePort {
  save(input: Omit<SavedCrawlerProfile, 'version'> & { version: string | null }): Promise<void>;
  remove(slot: number, version: string): Promise<void>;
  use(campaignId: string, slot: number, version: string): Promise<void>;
}
export function requireProfileSlot(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-3]$/.test(value)) throw new RangeError('Choose profile slot 1, 2, or 3.');
  return Number(value);
}
function version(form: FormData): string {
  const value = form.get('version');
  if (typeof value !== 'string') throw new RangeError('Refresh the saved profile.');
  return requireUuid(value);
}
export async function executeProfileCommand(userId: string, form: FormData, port: CrawlerProfilePort): Promise<string> {
  requireUuid(userId);
  const slot = requireProfileSlot(form.get('slot'));
  switch (form.get('operation')) {
    case 'save-profile': {
      const name = form.get('name');
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 200) throw new RangeError('Enter a crawler name of at most 200 characters.');
      const rawDraft = form.get('draft');
      if (typeof rawDraft !== 'string' || rawDraft.length > 20000) throw new RangeError('Invalid crawler profile.');
      const profile = createTutorialProfile(JSON.parse(rawDraft) as TutorialDraft);
      const rawRoll = form.get('rollId');
      const rollId = typeof rawRoll === 'string' && rawRoll ? requireUuid(rawRoll) : null;
      if (profile.method === 'rolled' && !rollId) throw new RangeError('Recover your saved roll first.');
      const expectedVersion = form.get('version') ? version(form) : null;
      await port.save({ slot, name: name.trim(), profile, rollId, version: expectedVersion });
      return 'Crawler profile saved.';
    }
    case 'delete-profile':
      if (form.get('confirmed') !== 'yes') throw new RangeError('Confirm removal of this saved profile.');
      await port.remove(slot, version(form));
      return 'Saved profile removed. Game crawlers are unchanged.';
    case 'use-profile': {
      const campaignId = form.get('campaignId');
      if (typeof campaignId !== 'string') throw new RangeError('Choose a game first.');
      await port.use(requireUuid(campaignId), slot, version(form));
      return 'Crawler created from your saved profile.';
    }
    default: throw new RangeError('Choose a profile action.');
  }
}