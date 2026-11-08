'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { createBrowserCrawlerId } from '@/adapters/browser-crawler-id';
import {
  changeCrawlerHealth,
  createCrawler,
  getCrawlerMaximumHealth,
  type Crawler,
} from '@/domain';
import type {
  CrawlerActions,
  CrawlerViewModel,
} from '@/models/crawler-presentation';
import type { CrawlerRepository } from '@/services/crawler-repository';

// This preview has no stored campaign yet; a selected campaign will replace it.
const PREVIEW_CAMPAIGN_ID = 'local-preview';

interface CrawlerPreview {
  crawler: Crawler | null;
  validationMessage: string | null;
}

function calculatePreview(
  name: string,
  baseSegments: string,
  constitution: string,
): CrawlerPreview {
  if (baseSegments.trim() === '' || constitution.trim() === '') {
    return {
      crawler: null,
      validationMessage: 'Enter both values to calculate maximum health.',
    };
  }

  try {
    return {
      crawler: createCrawler({
        id: 'draft-preview',
        campaignId: PREVIEW_CAMPAIGN_ID,
        name,
        baseSegments: Number(baseSegments),
        constitution: Number(constitution),
      }),
      validationMessage: null,
    };
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }

    return {
      crawler: null,
      validationMessage: error.message,
    };
  }
}

export function useCrawlerController(repository: CrawlerRepository): {
  model: CrawlerViewModel;
  actions: CrawlerActions;
} {
  const [name, setName] = useState('New crawler');
  const [baseSegments, setBaseSegments] = useState('10');
  const [constitution, setConstitution] = useState('10');
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const persistenceInProgress = useRef(false);

  const isTracking = crawler !== null;
  const preview = calculatePreview(name, baseSegments, constitution);
  const displayedCrawler = crawler ?? preview.crawler;

  function handleNameChange(event: ChangeEvent<HTMLInputElement>): void {
    if (isTracking || persistenceInProgress.current) return;
    setName(event.target.value);
  }

  function handleBaseSegmentsChange(event: ChangeEvent<HTMLInputElement>): void {
    if (isTracking || persistenceInProgress.current) return;
    setBaseSegments(event.target.value);
  }

  function handleConstitutionChange(event: ChangeEvent<HTMLInputElement>): void {
    if (isTracking || persistenceInProgress.current) return;
    setConstitution(event.target.value);
  }

  function handleStartTracking(): void {
    if (isTracking || persistenceInProgress.current || preview.crawler === null) return;

    const draft = preview.crawler;
    setCrawler(
      createCrawler({
        id: createBrowserCrawlerId(),
        campaignId: draft.campaignId,
        name: draft.name,
        baseSegments: draft.baseSegments,
        constitution: draft.constitution,
      }),
    );
    setPersistenceMessage('New crawler started. Click Save crawler to keep it.');
  }

  function handleHealthChange(adjustment: number): void {
    if (persistenceInProgress.current || crawler === null) return;
    setCrawler((current) =>
      current === null ? null : changeCrawlerHealth(current, adjustment),
    );
    setPersistenceMessage('Health changed. Click Save crawler to keep these changes.');
  }

  function handleResetTracking(): void {
    if (persistenceInProgress.current) return;
    setCrawler(null);
    setPersistenceMessage('Returned to setup. Your last saved crawler is still available to load.');
  }

  async function handleSave(): Promise<void> {
    if (persistenceInProgress.current || crawler === null) return;
    persistenceInProgress.current = true;
    setIsBusy(true);
    setPersistenceMessage('Saving crawler…');

    try {
      await repository.save(crawler);
      setPersistenceMessage(`Saved ${crawler.name} with ${crawler.currentSegments} health segments in this browser.`);
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? error.message : 'Unable to save this crawler.');
    } finally {
      persistenceInProgress.current = false;
      setIsBusy(false);
    }
  }

  async function handleLoad(): Promise<void> {
    if (persistenceInProgress.current || crawler !== null) return;
    persistenceInProgress.current = true;
    setIsBusy(true);
    setPersistenceMessage('Loading crawler…');

    try {
      const savedCrawler = await repository.load(PREVIEW_CAMPAIGN_ID);

      if (savedCrawler === null) {
        setPersistenceMessage('No saved crawler was found in this browser.');
        return;
      }

      setName(savedCrawler.name);
      setBaseSegments(String(savedCrawler.baseSegments));
      setConstitution(String(savedCrawler.constitution));
      setCrawler(savedCrawler);
      setPersistenceMessage(`Loaded ${savedCrawler.name} with ${savedCrawler.currentSegments} health segments.`);
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? error.message : 'Unable to load the saved crawler.');
    } finally {
      persistenceInProgress.current = false;
      setIsBusy(false);
    }
  }

  return {
    model: {
      name,
      displayName: displayedCrawler?.name ?? (name.trim() || 'New crawler'),
      baseSegments,
      constitution,
      maximumSegments:
        displayedCrawler === null
          ? null
          : getCrawlerMaximumHealth(displayedCrawler),
      validationMessage: isTracking ? null : preview.validationMessage,
      isTracking,
      canStartTracking: preview.crawler !== null && !isTracking && !isBusy,
      activeCrawler: crawler,
      isBusy,
      canSave: isTracking && !isBusy,
      canLoad: !isTracking && !isBusy,
      persistenceMessage,
    },
    actions: {
      onNameChange: handleNameChange,
      onBaseSegmentsChange: handleBaseSegmentsChange,
      onConstitutionChange: handleConstitutionChange,
      onStartTracking: handleStartTracking,
      onResetTracking: handleResetTracking,
      onHealthChange: handleHealthChange,
      onSave: handleSave,
      onLoad: handleLoad,
    },
  };
}
