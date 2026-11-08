import { describe, expect, it } from 'vitest';
import { restoreCrawler } from './crawler-restoration';

const savedCrawler = {
  id: 'crawler-1',
  campaignId: 'campaign-1',
  name: 'Carl',
  baseSegments: 10,
  constitution: 10,
  currentSegments: 7,
};

describe('restoreCrawler', () => {
  it('preserves identity, campaign and damaged health after JSON serialization', () => {
    const parsed: unknown = JSON.parse(JSON.stringify(savedCrawler));
    expect(restoreCrawler(parsed)).toEqual(savedCrawler);
  });

  it('preserves zero health rather than restoring full health', () => {
    expect(restoreCrawler({ ...savedCrawler, currentSegments: 0 }).currentSegments)
      .toBe(0);
  });

  it('uses the Constitution-adjusted maximum when restoring health', () => {
    expect(
      restoreCrawler({ ...savedCrawler, constitution: 14, currentSegments: 12 })
        .currentSegments,
    ).toBe(12);
  });

  it.each([null, [], 'crawler', 42, {}])('rejects malformed data: %j', (value) => {
    expect(() => restoreCrawler(value)).toThrow(RangeError);
  });

  it.each([
    { id: '' },
    { campaignId: ' ' },
    { name: 123 },
    { baseSegments: '10' },
    { constitution: null },
    { currentSegments: undefined },
    { currentSegments: -1 },
    { currentSegments: 11 },
    { currentSegments: 1.5 },
    { currentSegments: Number.NaN },
  ])('rejects invalid saved fields: %j', (changes) => {
    expect(() => restoreCrawler({ ...savedCrawler, ...changes }))
      .toThrow(RangeError);
  });
});
