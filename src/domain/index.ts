export * from './dcc-domain';

export {
  adjustHealthSegments,
  calculateMaxHealthSegments,
} from './health';

export {
  createCrawler,
  getCrawlerMaximumHealth,
  changeCrawlerHealth,
} from './crawler';

export type {
  Crawler,
  CreateCrawlerInput,
} from './crawler';

export { restoreCrawler } from './crawler-restoration';

export {
  CampaignAccessError,
  createCampaign,
  getCampaignRole,
  addCampaignPlayer,
  createCampaignCrawler,
  changeCampaignCrawlerHealth,
  updateCampaignCrawlerStats,
} from './campaign';

export type {
  Campaign,
  CampaignRole,
  OwnedCrawler,
  CampaignCrawlerInput,
  CrawlerStatsInput,
} from './campaign';
