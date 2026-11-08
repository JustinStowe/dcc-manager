import {
  adjustHealthSegments,
  calculateMaxHealthSegments,
} from './health';

export interface CreateCrawlerInput {
  readonly id: string;
  readonly campaignId: string;
  readonly name: string;
  readonly baseSegments: number;
  readonly constitution: number;
}

export interface Crawler extends CreateCrawlerInput {
  readonly currentSegments: number;
}

export function createCrawler(input: CreateCrawlerInput): Crawler {
  const id = input.id.trim();
  const campaignId = input.campaignId.trim();
  const name = input.name.trim();

  if (id === '') {
    throw new RangeError('A crawler must have an ID.');
  }

  if (campaignId === '') {
    throw new RangeError('A crawler must belong to a campaign.');
  }

  if (name === '' || name.length > 200) {
    throw new RangeError(
      'Crawler name must contain between 1 and 200 characters.',
    );
  }

  const maximumSegments = calculateMaxHealthSegments(
    input.baseSegments,
    input.constitution,
  );

  return {
    id,
    campaignId,
    name,
    baseSegments: input.baseSegments,
    constitution: input.constitution,
    currentSegments: maximumSegments,
  };
}

export function getCrawlerMaximumHealth(crawler: Crawler): number {
  return calculateMaxHealthSegments(
    crawler.baseSegments,
    crawler.constitution,
  );
}

export function changeCrawlerHealth(
  crawler: Crawler,
  adjustment: number,
): Crawler {
  const maximumSegments = getCrawlerMaximumHealth(crawler);

  return {
    ...crawler,
    currentSegments: adjustHealthSegments(
      crawler.currentSegments,
      maximumSegments,
      adjustment,
    ),
  };
}