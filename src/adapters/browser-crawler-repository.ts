import { restoreCrawler, type Crawler } from '@/domain';
import type { CrawlerRepository } from '@/services/crawler-repository';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem'>;

function storageKey(campaignId: string): string {
  // Preserve existing browser saves when running at the same site address.
  return `tabletop-forge:dcc:crawler:${encodeURIComponent(campaignId)}`;
}

function readSnapshot(text: string, campaignId: string): Crawler {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('The saved crawler is not valid JSON. The saved data was kept.');
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('The saved crawler format is invalid. The saved data was kept.');
  }

  const snapshot = value as Record<string, unknown>;
  if (snapshot['schemaVersion'] !== 1) {
    throw new Error('This saved crawler version is not supported. The saved data was kept.');
  }

  let crawler: Crawler;
  try {
    crawler = restoreCrawler(snapshot['crawler']);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    throw new Error(`The saved crawler is invalid: ${error.message} The saved data was kept.`);
  }

  if (crawler.campaignId !== campaignId) {
    throw new Error('The saved crawler belongs to a different campaign. The saved data was kept.');
  }
  return crawler;
}

export function createBrowserCrawlerRepository(
  getStorage: () => BrowserStorage = () => window.localStorage,
): CrawlerRepository {
  return {
    async save(crawler) {
      const validated = restoreCrawler(crawler);
      const snapshot = JSON.stringify({ schemaVersion: 1, crawler: validated });
      try {
        getStorage().setItem(storageKey(validated.campaignId), snapshot);
      } catch {
        throw new Error('Could not save. Browser storage may be blocked or full. Your current crawler is still on screen.');
      }
    },

    async load(campaignId) {
      let text: string | null;
      try {
        text = getStorage().getItem(storageKey(campaignId));
      } catch {
        throw new Error('Could not read browser storage. Check whether this browser allows site data.');
      }
      return text === null ? null : readSnapshot(text, campaignId);
    },
  };
}
