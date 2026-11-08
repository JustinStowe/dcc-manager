import { describe, expect, it } from 'vitest';
import { createBrowserCrawlerRepository } from './browser-crawler-repository';

const crawler = {
  id: 'crawler-1',
  campaignId: 'local-preview',
  name: 'Carl',
  baseSegments: 10,
  constitution: 10,
  currentSegments: 7,
};

function createMemoryStorage() {
  const records = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return records.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      records.set(key, value);
    },
  };
}

describe('browser crawler repository', () => {
  it('can be constructed without a browser during server rendering', () => {
    expect(() => createBrowserCrawlerRepository()).not.toThrow();
  });

  it('returns null when no save exists', async () => {
    const repository = createBrowserCrawlerRepository(createMemoryStorage);
    expect(await repository.load(crawler.campaignId)).toBe(null);
  });

  it('preserves identity and damaged health through a save/load round trip', async () => {
    const storage = createMemoryStorage();
    const repository = createBrowserCrawlerRepository(() => storage);
    await repository.save(crawler);
    expect(await repository.load(crawler.campaignId)).toEqual(crawler);
  });

  it('replaces the snapshot and preserves zero health', async () => {
    const storage = createMemoryStorage();
    const repository = createBrowserCrawlerRepository(() => storage);
    await repository.save(crawler);
    await repository.save({ ...crawler, currentSegments: 0 });
    expect(await repository.load(crawler.campaignId)).toEqual({
      ...crawler,
      currentSegments: 0,
    });
  });

  it('keeps each campaign save under a separate key', async () => {
    const storage = createMemoryStorage();
    const repository = createBrowserCrawlerRepository(() => storage);
    await repository.save(crawler);
    await repository.save({ ...crawler, campaignId: 'campaign-2', name: 'Donut' });
    expect(await repository.load(crawler.campaignId)).toEqual(crawler);
    expect((await repository.load('campaign-2'))?.name).toBe('Donut');
  });

  it.each([
    'not JSON',
    'null',
    JSON.stringify({ schemaVersion: 2, crawler }),
    JSON.stringify({ schemaVersion: 1, crawler: { ...crawler, currentSegments: 11 } }),
    JSON.stringify({ schemaVersion: 1, crawler: { ...crawler, campaignId: 'other' } }),
  ])('rejects invalid snapshots without overwriting stored data: %s', async (savedText) => {
    const storage = createMemoryStorage();
    const key = 'tabletop-forge:dcc:crawler:local-preview';
    storage.setItem(key, savedText);
    const repository = createBrowserCrawlerRepository(() => storage);
    await expect(repository.load(crawler.campaignId)).rejects.toThrow();
    expect(storage.getItem(key)).toBe(savedText);
  });

  it('reports blocked storage on load', async () => {
    const repository = createBrowserCrawlerRepository(() => {
      throw new Error('Storage denied');
    });
    await expect(repository.load(crawler.campaignId)).rejects.toThrow('Could not read');
  });

  it('reports a failed save without changing the crawler', async () => {
    const repository = createBrowserCrawlerRepository(() => ({
      getItem: () => null,
      setItem: () => { throw new Error('Quota exceeded'); },
    }));
    await expect(repository.save(crawler)).rejects.toThrow('Could not save');
    expect(crawler.currentSegments).toBe(7);
  });
});
