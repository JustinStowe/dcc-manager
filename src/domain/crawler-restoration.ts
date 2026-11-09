import { createCrawler, getCrawlerMaximumHealth, type Crawler } from './crawler';
import { adjustHealthSegments } from './health';

function readText(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== 'string') {
    throw new RangeError(`Saved crawler field "${key}" must be text.`);
  }
  return value;
}

function readNumber(data: Record<string, unknown>, key: string): number {
  const value = data[key];
  if (typeof value !== 'number') {
    throw new RangeError(`Saved crawler field "${key}" must be a number.`);
  }
  return value;
}

export function restoreCrawler(value: unknown): Crawler {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RangeError('Saved crawler must be an object.');
  }

  const data = value as Record<string, unknown>;
  const ruleset = data['ruleset'];
  if (ruleset !== undefined && ruleset !== 'prototype' && ruleset !== 'tutorial-v1') throw new RangeError('Unsupported crawler ruleset.');
  const crawler = createCrawler({
    id: readText(data, 'id'),
    campaignId: readText(data, 'campaignId'),
    name: readText(data, 'name'),
    baseSegments: readNumber(data, 'baseSegments'),
    constitution: readNumber(data, 'constitution'),
    ...(ruleset === undefined ? {} : { ruleset }),
  });

  const currentSegments = adjustHealthSegments(
    readNumber(data, 'currentSegments'),
    getCrawlerMaximumHealth(crawler),
    0,
  );

  return { ...crawler, currentSegments };
}
