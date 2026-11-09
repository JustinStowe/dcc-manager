import { getCampaignRole, getVisibleCampaignCrawlers, type Campaign } from '@/domain';

export function getDashboardCrawlers(campaign: Campaign | null, userId: string, requestedId?: string) {
  const visible = campaign && getCampaignRole(campaign, userId) ? getVisibleCampaignCrawlers(campaign, userId) : [];
  // Selection is always resolved against the visible list, never against a URL's
  // claimed owner or an unfiltered campaign roster.
  const selected = visible.find((entry) => entry.crawler.id === requestedId) ?? visible[0] ?? null;
  return { visible, selected };
}
