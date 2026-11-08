import { describe, expect, it } from 'vitest';
import {
  changeCrawlerHealth,
  createCrawler,
  getCrawlerMaximumHealth,
} from './crawler';

const exampleInput = {
  id: 'crawler-1',
  campaignId: 'campaign-1',
  name: 'Carl',
  baseSegments: 10,
  constitution: 10,
};

describe('createCrawler', () => {
  it('trims the name and starts at full calculated health', () => {
    const crawler = createCrawler({
      ...exampleInput,
      name: '  Carl  ',
      constitution: 14,
    });

    expect(crawler.name).toBe('Carl');
    expect(crawler.currentSegments).toBe(12);
    expect(getCrawlerMaximumHealth(crawler)).toBe(12);
  });

  it.each(['', '   ', 'a'.repeat(201)])(
    'rejects an invalid name: %s',
    (name) => {
      expect(() =>
        createCrawler({ ...exampleInput, name }),
      ).toThrow(RangeError);
    },
  );

  it('requires a crawler ID', () => {
    expect(() =>
      createCrawler({ ...exampleInput, id: ' ' }),
    ).toThrow(RangeError);
  });

  it('requires a campaign ID', () => {
    expect(() =>
      createCrawler({ ...exampleInput, campaignId: ' ' }),
    ).toThrow(RangeError);
  });
});

describe('changeCrawlerHealth', () => {
  it('returns updated health without modifying the original crawler', () => {
    const original = createCrawler(exampleInput);

    const updated = changeCrawlerHealth(original, -3);

    expect(updated).not.toBe(original);
    expect(original.currentSegments).toBe(10);
    expect(updated).toEqual({
      ...original,
      currentSegments: 7,
    });
  });
});