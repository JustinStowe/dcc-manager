import {
  addCampaignPlayer, changeCampaignCrawlerHealth, createCampaignCrawler,
  restoreCrawler, updateCampaignCrawlerStats, type Campaign,
} from '@/domain';
import type { TutorialProfile } from '@/domain/tutorial';
import type { InventoryItem } from '@/domain/inventory';

export interface CampaignWorkspace {
  readonly userId: string;
  readonly campaign: Campaign | null;
  readonly versions: Readonly<Record<string, string>>;
  readonly tutorials?: Readonly<Record<string, { profile: TutorialProfile; number: number }>>;
  readonly inventories?: Readonly<Record<string, readonly InventoryItem[]>>;
}

export interface CampaignWritePort {
  addPlayer(campaignId: string, userId: string): Promise<void>;
  createCrawler(input: { campaignId: string; ownerUserId: string; name: string; baseSegments: number; constitution: number; currentSegments: number }): Promise<void>;
  changeHealth(crawlerId: string, version: string, adjustment: number): Promise<void>;
  updateStats(crawlerId: string, version: string, baseSegments: number, constitution: number): Promise<void>;
}

export interface CampaignFormState { readonly error: string | null; readonly notice: string | null }

function text(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== 'string' || value.trim() === '') throw new RangeError(`Enter ${key}.`);
  return value.trim();
}

function integer(form: FormData, key: string): number {
  const value = Number(text(form, key));
  if (!Number.isSafeInteger(value)) throw new RangeError(`${key} must be a whole number.`);
  return value;
}

export function requireUuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new RangeError('Use a valid account or record ID.');
  }
  return value.toLowerCase();
}

export async function executeCampaignCommand(
  workspace: CampaignWorkspace, form: FormData, port: CampaignWritePort,
): Promise<string> {
  const { campaign, userId } = workspace;
  if (campaign === null) throw new Error('Ask the GM to add your account to the campaign.');
  const operation = text(form, 'operation');
  if (operation === 'add-player') {
    const target = requireUuid(text(form, 'userId'));
    addCampaignPlayer(campaign, userId, target);
    await port.addPlayer(campaign.id, target);
    return 'Player added.';
  }
  if (operation === 'create' || operation === 'import') {
    // Owners are account IDs, never browser save owner claims.
    const ownerUserId = operation === 'import' ? userId : requireUuid(text(form, 'ownerUserId'));
    const imported = operation === 'import' ? restoreCrawler(JSON.parse(text(form, 'snapshot'))) : null;
    const candidate = createCampaignCrawler(campaign, userId, {
      id: 'new-crawler', ownerUserId,
      name: imported?.name ?? text(form, 'name'),
      baseSegments: imported?.baseSegments ?? integer(form, 'baseSegments'),
      constitution: imported?.constitution ?? integer(form, 'constitution'),
    }).crawlers.at(-1);
    if (!candidate) throw new Error('Unable to create crawler.');
    if (campaign.crawlers.some((entry) => entry.ownerUserId === ownerUserId)) {
      throw new RangeError('This account already has a campaign crawler.');
    }
    await port.createCrawler({
      campaignId: campaign.id, ownerUserId, name: candidate.crawler.name,
      baseSegments: candidate.crawler.baseSegments, constitution: candidate.crawler.constitution,
      currentSegments: imported?.currentSegments ?? candidate.crawler.currentSegments,
    });
    return imported ? 'Browser crawler imported. The original browser save was kept.' : 'Crawler created and saved.';
  }
  if (operation !== 'health' && operation !== 'stats') throw new RangeError('Unknown campaign action.');
  const crawlerId = requireUuid(text(form, 'crawlerId'));
  const version = requireUuid(text(form, 'version'));
  if (!workspace.versions[crawlerId] || workspace.versions[crawlerId] !== version) {
    throw new Error('Crawler changed. Refresh the campaign before trying again.');
  }
  if (operation === 'health') {
    const amount = integer(form, 'amount');
    const direction = text(form, 'direction');
    if (amount <= 0 || (direction !== 'damage' && direction !== 'heal')) throw new RangeError('Enter a positive whole number and choose damage or healing.');
    const adjustment = direction === 'damage' ? -amount : amount;
    changeCampaignCrawlerHealth(campaign, userId, crawlerId, adjustment);
    await port.changeHealth(crawlerId, version, adjustment);
    return 'Health saved.';
  }
  const baseSegments = integer(form, 'baseSegments');
  const constitution = integer(form, 'constitution');
  updateCampaignCrawlerStats(campaign, userId, crawlerId, { baseSegments, constitution });
  await port.updateStats(crawlerId, version, baseSegments, constitution);
  return 'Stats saved. Current health was preserved within the new maximum.';
}
