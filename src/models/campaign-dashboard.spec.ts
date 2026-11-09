import { describe, expect, it } from 'vitest';
import { createCampaign, addCampaignPlayer, createCampaignCrawler } from '@/domain';
import { getDashboardCrawlers } from './campaign-dashboard';

function fixture() {
  let campaign = createCampaign({ id: 'game', name: 'Game', gmUserId: 'gm' });
  for (const user of ['alice', 'bob']) {
    campaign = addCampaignPlayer(campaign, 'gm', user);
    campaign = createCampaignCrawler(campaign, 'gm', { id: user, ownerUserId: user, name: user, baseSegments: 10, constitution: 3 });
  }
  return campaign;
}
describe('Dashboard crawler selection', () => {
  it('lets the GM select any visible crawler', () => {
    const result = getDashboardCrawlers(fixture(), 'gm', 'bob');
    expect(result.visible.length).toBe(2); expect(result.selected?.crawler.id).toBe('bob');
  });
  it('never exposes another player through a guessed selector', () => {
    const result = getDashboardCrawlers(fixture(), 'alice', 'bob');
    expect(result.visible.length).toBe(1); expect(result.selected?.crawler.id).toBe('alice');
  });
  it('falls back to the first visible crawler for an unknown selection', () => {
    expect(getDashboardCrawlers(fixture(), 'gm', 'unknown').selected?.crawler.id).toBe('alice');
  });
  it('handles an unavailable game without a selected crawler', () => {
    expect(getDashboardCrawlers(null, 'alice').selected).toBe(null);
  });
  it('hides the entire roster from an outsider', () => {
    const result = getDashboardCrawlers(fixture(), 'outsider', 'bob');
    expect(result.visible.length).toBe(0); expect(result.selected).toBe(null);
  });
});
