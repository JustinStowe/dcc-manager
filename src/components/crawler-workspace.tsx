'use client';

import { useCrawlerController } from '@/controllers/use-crawler-controller';
import { CrawlerView } from '@/views/crawler-view';
import { createBrowserCrawlerRepository } from '@/adapters/browser-crawler-repository';

const crawlerRepository = createBrowserCrawlerRepository();

export function CrawlerWorkspace() {
  const { model, actions } = useCrawlerController(crawlerRepository);
  return <CrawlerView model={model} actions={actions} />;
}
