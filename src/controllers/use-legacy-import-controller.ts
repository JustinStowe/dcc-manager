'use client';

import { useRef, useState } from 'react';
import { createBrowserCrawlerRepository } from '@/adapters/browser-crawler-repository';
import type { Crawler } from '@/domain';

export function useLegacyImportController() {
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const loading = useRef(false);
  async function handleFindSave() {
    if (loading.current) return;
    loading.current = true;
    setIsBusy(true);
    setMessage(null);
    setCrawler(null);
    try {
      const saved = await createBrowserCrawlerRepository().load('local-preview');
      setCrawler(saved);
      if (!saved) setMessage('No saved preview crawler was found at this browser address.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not read the browser save.');
    } finally { loading.current = false; setIsBusy(false); }
  }
  return { model: { crawler, message, isBusy }, actions: { onFindSave: handleFindSave } };
}
