import type { Crawler } from '@/domain';

// One saved crawler per campaign for this first persistence milestone.
export interface CrawlerRepository {
  save(crawler: Crawler): Promise<void>;
  load(campaignId: string): Promise<Crawler | null>;
}
