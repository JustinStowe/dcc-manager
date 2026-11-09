import { describe, expect, it } from 'vitest';
import { CampaignAccessError, addCampaignPlayer, createCampaign, createCampaignCrawler, getVisibleCampaignCrawlers } from './campaign';

function fixture() {
  let campaign = createCampaign({ id: 'one', name: 'One', gmUserId: 'gm' });
  campaign = addCampaignPlayer(campaign, 'gm', 'alice');
  campaign = addCampaignPlayer(campaign, 'gm', 'bob');
  for (const ownerUserId of ['alice', 'bob', 'gm']) {
    campaign = createCampaignCrawler(campaign, ownerUserId, { id: ownerUserId, ownerUserId, name: ownerUserId, baseSegments: 10, constitution: 10 });
  }
  return campaign;
}

describe('crawler visibility', () => {
  it.each(['alice', 'bob'])('shows %s only their own crawler', (userId) => {
    expect(getVisibleCampaignCrawlers(fixture(), userId).map((entry) => entry.ownerUserId)).toEqual([userId]);
  });
  it('shows the GM all crawlers', () => {
    expect(getVisibleCampaignCrawlers(fixture(), 'gm').length).toBe(3);
  });
  it.each(['outsider', ''])('rejects non-member %s', (userId) => {
    expect(() => getVisibleCampaignCrawlers(fixture(), userId)).toThrow(CampaignAccessError);
  });
  it('returns an empty list for a member without a crawler', () => {
    expect(getVisibleCampaignCrawlers(addCampaignPlayer(fixture(), 'gm', 'new'), 'new')).toEqual([]);
  });
  it('does not change the campaign roster', () => {
    const campaign = fixture();
    getVisibleCampaignCrawlers(campaign, 'alice');
    expect(campaign.crawlers.length).toBe(3);
  });
});
