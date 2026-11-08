import {
  changeCrawlerHealth,
  createCrawler,
  getCrawlerMaximumHealth,
  type Crawler,
} from './crawler';

export type CampaignRole = 'gm' | 'player';

export interface OwnedCrawler {
  readonly ownerUserId: string;
  readonly crawler: Crawler;
}

export interface Campaign {
  readonly id: string;
  readonly name: string;
  readonly gmUserId: string;
  readonly playerUserIds: readonly string[];
  readonly crawlers: readonly OwnedCrawler[];
}

export interface CampaignCrawlerInput {
  readonly id: string;
  readonly ownerUserId: string;
  readonly name: string;
  readonly baseSegments: number;
  readonly constitution: number;
}

export interface CrawlerStatsInput {
  readonly baseSegments: number;
  readonly constitution: number;
}

export class CampaignAccessError extends Error {
  constructor() {
    super('You do not have permission to perform this campaign action.');
    this.name = 'CampaignAccessError';
  }
}

function requiredText(value: string, label: string): string {
  const text = value.trim();
  if (text === '') throw new RangeError(`${label} is required.`);
  return text;
}

export function createCampaign(input: {
  readonly id: string;
  readonly name: string;
  readonly gmUserId: string;
}): Campaign {
  const name = requiredText(input.name, 'Campaign name');
  if (name.length > 200) {
    throw new RangeError('Campaign name must contain between 1 and 200 characters.');
  }
  return {
    id: requiredText(input.id, 'Campaign ID'),
    name,
    gmUserId: requiredText(input.gmUserId, 'GM user ID'),
    playerUserIds: [],
    crawlers: [],
  };
}

// The caller must supply a verified user ID and authoritative campaign state.
// These pure rules do not authenticate users or make browser data trustworthy.
export function getCampaignRole(
  campaign: Campaign,
  userId: string,
): CampaignRole | null {
  if (userId === campaign.gmUserId) return 'gm';
  return campaign.playerUserIds.includes(userId) ? 'player' : null;
}

function requireMember(campaign: Campaign, actorUserId: string): CampaignRole {
  const role = getCampaignRole(campaign, actorUserId);
  if (role === null) throw new CampaignAccessError();
  return role;
}

function requireGm(campaign: Campaign, actorUserId: string): void {
  if (requireMember(campaign, actorUserId) !== 'gm') {
    throw new CampaignAccessError();
  }
}

export function addCampaignPlayer(
  campaign: Campaign,
  actorUserId: string,
  playerUserId: string,
): Campaign {
  requireGm(campaign, actorUserId);
  const id = requiredText(playerUserId, 'Player user ID');
  if (getCampaignRole(campaign, id) !== null) {
    throw new RangeError('This user is already a campaign member.');
  }
  return { ...campaign, playerUserIds: [...campaign.playerUserIds, id] };
}

export function createCampaignCrawler(
  campaign: Campaign,
  actorUserId: string,
  input: CampaignCrawlerInput,
): Campaign {
  const role = requireMember(campaign, actorUserId);
  const ownerUserId = requiredText(input.ownerUserId, 'Crawler owner user ID');
  if (role !== 'gm' && ownerUserId !== actorUserId) {
    throw new CampaignAccessError();
  }
  if (getCampaignRole(campaign, ownerUserId) === null) {
    throw new RangeError('The crawler owner must belong to this campaign.');
  }
  const crawler = createCrawler({
    id: input.id,
    campaignId: campaign.id,
    name: input.name,
    baseSegments: input.baseSegments,
    constitution: input.constitution,
  });
  if (campaign.crawlers.some((entry) => entry.crawler.id === crawler.id)) {
    throw new RangeError('A crawler with this ID already exists in the campaign.');
  }
  return {
    ...campaign,
    crawlers: [...campaign.crawlers, { ownerUserId, crawler }],
  };
}

function findCrawler(campaign: Campaign, crawlerId: string): OwnedCrawler {
  const entry = campaign.crawlers.find((item) => item.crawler.id === crawlerId);
  if (entry === undefined) throw new RangeError('Crawler was not found in this campaign.');
  return entry;
}

function replaceCrawler(campaign: Campaign, crawler: Crawler): Campaign {
  return {
    ...campaign,
    crawlers: campaign.crawlers.map((entry) =>
      entry.crawler.id === crawler.id ? { ...entry, crawler } : entry,
    ),
  };
}

export function changeCampaignCrawlerHealth(
  campaign: Campaign,
  actorUserId: string,
  crawlerId: string,
  adjustment: number,
): Campaign {
  const role = requireMember(campaign, actorUserId);
  const entry = findCrawler(campaign, crawlerId);
  if (role !== 'gm' && entry.ownerUserId !== actorUserId) {
    throw new CampaignAccessError();
  }
  return replaceCrawler(campaign, changeCrawlerHealth(entry.crawler, adjustment));
}

export function updateCampaignCrawlerStats(
  campaign: Campaign,
  actorUserId: string,
  crawlerId: string,
  input: CrawlerStatsInput,
): Campaign {
  requireGm(campaign, actorUserId);
  const original = findCrawler(campaign, crawlerId).crawler;
  // Explicit fields prevent a broad update from changing identity or ownership.
  const updated = createCrawler({
    id: original.id,
    campaignId: original.campaignId,
    name: original.name,
    baseSegments: input.baseSegments,
    constitution: input.constitution,
  });
  return replaceCrawler(campaign, {
    ...updated,
    // Stat edits do not heal. Lower maxima clamp health, and zero stays zero.
    currentSegments: Math.min(original.currentSegments, getCrawlerMaximumHealth(updated)),
  });
}
