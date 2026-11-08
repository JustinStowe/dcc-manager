import { describe, expect, it } from 'vitest';
import {
  CampaignAccessError,
  addCampaignPlayer,
  changeCampaignCrawlerHealth,
  createCampaign,
  createCampaignCrawler,
  getCampaignRole,
  updateCampaignCrawlerStats,
} from './campaign';

const stats = { baseSegments: 10, constitution: 10 };
const input = { id: 'carl', ownerUserId: 'alice', name: 'Carl', ...stats };

function campaignWithPlayers() {
  let campaign = createCampaign({ id: 'campaign-1', name: 'Floor one', gmUserId: 'gm' });
  campaign = addCampaignPlayer(campaign, 'gm', 'alice');
  return addCampaignPlayer(campaign, 'gm', 'bob');
}

function campaignWithCrawler() {
  return createCampaignCrawler(campaignWithPlayers(), 'alice', input);
}

describe('campaign membership', () => {
  it('creates a campaign with one GM and an empty roster', () => {
    const campaign = createCampaign({ id: ' one ', name: ' Floor one ', gmUserId: ' gm ' });
    expect(campaign).toEqual({ id: 'one', name: 'Floor one', gmUserId: 'gm', playerUserIds: [], crawlers: [] });
  });

  it.each(['id', 'name', 'gmUserId'])(
    'requires %s',
    (key) => {
      expect(() => createCampaign({ id: 'one', name: 'One', gmUserId: 'gm', [key]: ' ' })).toThrow(RangeError);
    },
  );

  it('rejects an overlong campaign name', () => {
    expect(() => createCampaign({ id: 'one', name: 'a'.repeat(201), gmUserId: 'gm' })).toThrow(RangeError);
  });

  it('resolves roles from membership and rejects unknown or blank users', () => {
    const campaign = campaignWithPlayers();
    expect(getCampaignRole(campaign, 'gm')).toBe('gm');
    expect(getCampaignRole(campaign, 'alice')).toBe('player');
    expect(getCampaignRole(campaign, 'outsider')).toBe(null);
    expect(getCampaignRole(campaign, '')).toBe(null);
  });

  it('adds a player without changing the original membership', () => {
    const original = campaignWithPlayers();
    const updated = addCampaignPlayer(original, 'gm', ' charlie ');
    expect(updated.playerUserIds).toEqual(['alice', 'bob', 'charlie']);
    expect(original.playerUserIds).toEqual(['alice', 'bob']);
  });

  it.each(['alice', 'outsider', ''])(
    'prevents %s from adding members',
    (actor) => {
      expect(() => addCampaignPlayer(campaignWithPlayers(), actor, 'charlie')).toThrow(CampaignAccessError);
    },
  );

  it.each(['alice', 'gm', ' '])('rejects duplicate or empty membership: %s', (id) => {
    expect(() => addCampaignPlayer(campaignWithPlayers(), 'gm', id)).toThrow(RangeError);
  });
});

describe('campaign crawler creation', () => {
  it('lets a player create their own crawler and choose initial stats', () => {
    const campaign = createCampaignCrawler(campaignWithPlayers(), 'alice', { ...input, constitution: 14 });
    expect(campaign.crawlers[0]).toEqual({
      ownerUserId: 'alice',
      crawler: { id: 'carl', campaignId: 'campaign-1', name: 'Carl', baseSegments: 10, constitution: 14, currentSegments: 12 },
    });
  });

  it('lets the GM create a crawler for a member', () => {
    expect(createCampaignCrawler(campaignWithPlayers(), 'gm', input).crawlers[0].ownerUserId).toBe('alice');
  });

  it('lets the GM own a crawler', () => {
    expect(createCampaignCrawler(campaignWithPlayers(), 'gm', { ...input, ownerUserId: 'gm' }).crawlers[0].ownerUserId).toBe('gm');
  });

  it('rejects a player creating a crawler for another member', () => {
    expect(() => createCampaignCrawler(campaignWithPlayers(), 'bob', input)).toThrow(CampaignAccessError);
  });

  it('rejects an outsider creating a crawler', () => {
    expect(() => createCampaignCrawler(campaignWithPlayers(), 'outsider', { ...input, ownerUserId: 'outsider' })).toThrow(CampaignAccessError);
  });

  it('requires the owner to belong to the campaign', () => {
    expect(() => createCampaignCrawler(campaignWithPlayers(), 'gm', { ...input, ownerUserId: 'outsider' })).toThrow(RangeError);
  });

  it('rejects duplicate IDs without overwriting an existing crawler', () => {
    const campaign = campaignWithCrawler();
    expect(() => createCampaignCrawler(campaign, 'bob', { ...input, ownerUserId: 'bob' })).toThrow(RangeError);
    expect(campaign.crawlers.length).toBe(1);
    expect(campaign.crawlers[0].ownerUserId).toBe('alice');
  });

  it('uses existing crawler stat validation during creation', () => {
    expect(() => createCampaignCrawler(campaignWithPlayers(), 'alice', { ...input, constitution: -1 })).toThrow(RangeError);
  });
});

describe('campaign crawler health', () => {
  it.each(['alice', 'gm'])('lets %s apply damage and healing', (actor) => {
    const original = campaignWithCrawler();
    const damaged = changeCampaignCrawlerHealth(original, actor, 'carl', -3);
    const healed = changeCampaignCrawlerHealth(damaged, actor, 'carl', 1);
    expect(original.crawlers[0].crawler.currentSegments).toBe(10);
    expect(damaged.crawlers[0].crawler.currentSegments).toBe(7);
    expect(healed.crawlers[0].crawler.currentSegments).toBe(8);
  });

  it.each(['bob', 'outsider', ''])('rejects health edits by %s', (actor) => {
    expect(() => changeCampaignCrawlerHealth(campaignWithCrawler(), actor, 'carl', -1)).toThrow(CampaignAccessError);
  });

  it('preserves other crawlers when saving a health change', () => {
    const original = createCampaignCrawler(campaignWithCrawler(), 'bob', { ...input, id: 'donut', ownerUserId: 'bob' });
    const updated = changeCampaignCrawlerHealth(original, 'alice', 'carl', -3);
    expect(updated.crawlers.length).toBe(2);
    expect(updated.crawlers[1]).toEqual(original.crawlers[1]);
  });

  it('clamps damage and healing with the existing health rules', () => {
    const zero = changeCampaignCrawlerHealth(campaignWithCrawler(), 'alice', 'carl', -100);
    expect(zero.crawlers[0].crawler.currentSegments).toBe(0);
    expect(changeCampaignCrawlerHealth(zero, 'alice', 'carl', 100).crawlers[0].crawler.currentSegments).toBe(10);
  });

  it('rejects fractional health adjustments', () => {
    expect(() => changeCampaignCrawlerHealth(campaignWithCrawler(), 'alice', 'carl', 0.5)).toThrow(RangeError);
  });

  it('does not find crawlers from a different campaign', () => {
    const other = createCampaign({ id: 'campaign-2', name: 'Two', gmUserId: 'gm' });
    expect(() => changeCampaignCrawlerHealth(other, 'gm', 'carl', -1)).toThrow(RangeError);
  });
});

describe('GM-controlled stats after creation', () => {
  it.each(['alice', 'bob', 'outsider', ''])('rejects stat edits by %s, including the owner', (actor) => {
    expect(() => updateCampaignCrawlerStats(campaignWithCrawler(), actor, 'carl', { ...stats, constitution: 14 })).toThrow(CampaignAccessError);
  });

  it('lets the GM increase stats without healing or changing the original', () => {
    const original = changeCampaignCrawlerHealth(campaignWithCrawler(), 'alice', 'carl', -3);
    const updated = updateCampaignCrawlerStats(original, 'gm', 'carl', { baseSegments: 20, constitution: 14 });
    expect(updated.crawlers[0].crawler).toEqual({ ...original.crawlers[0].crawler, baseSegments: 20, constitution: 14, currentSegments: 7 });
    expect(original.crawlers[0].crawler.baseSegments).toBe(10);
  });

  it('clamps current health when the GM reduces maximum health', () => {
    const updated = updateCampaignCrawlerStats(campaignWithCrawler(), 'gm', 'carl', { ...stats, baseSegments: 5 });
    expect(updated.crawlers[0].crawler.currentSegments).toBe(5);
  });

  it('keeps zero health at zero when the GM increases stats', () => {
    const zero = changeCampaignCrawlerHealth(campaignWithCrawler(), 'alice', 'carl', -100);
    const updated = updateCampaignCrawlerStats(zero, 'gm', 'carl', { ...stats, baseSegments: 20 });
    expect(updated.crawlers[0].crawler.currentSegments).toBe(0);
  });

  it('rejects invalid GM stat changes', () => {
    expect(() => updateCampaignCrawlerStats(campaignWithCrawler(), 'gm', 'carl', { ...stats, baseSegments: 0 })).toThrow(RangeError);
  });

  it('ignores extra runtime fields that try to replace identity or ownership', () => {
    const original = campaignWithCrawler();
    const maliciousInput = { ...stats, id: 'replacement', campaignId: 'other', ownerUserId: 'bob', name: 'Changed', currentSegments: 0 };
    const updated = updateCampaignCrawlerStats(original, 'gm', 'carl', maliciousInput);
    expect(updated.crawlers[0]).toEqual(original.crawlers[0]);
  });

  it('rejects attempts to update a missing crawler', () => {
    expect(() => updateCampaignCrawlerStats(campaignWithCrawler(), 'gm', 'missing', stats)).toThrow(RangeError);
  });
});
