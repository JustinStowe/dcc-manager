import type { ChangeEventHandler } from 'react';
import type { Crawler } from '@/domain';

export interface CrawlerViewModel {
  name: string;
  displayName: string;
  baseSegments: string;
  constitution: string;
  maximumSegments: number | null;
  validationMessage: string | null;
  isTracking: boolean;
  canStartTracking: boolean;
  activeCrawler: Crawler | null;
  isBusy: boolean;
  canSave: boolean;
  canLoad: boolean;
  persistenceMessage: string | null;
}

export interface CrawlerActions {
  onNameChange: ChangeEventHandler<HTMLInputElement>;
  onBaseSegmentsChange: ChangeEventHandler<HTMLInputElement>;
  onConstitutionChange: ChangeEventHandler<HTMLInputElement>;
  onStartTracking: () => void;
  onResetTracking: () => void;
  onHealthChange: (adjustment: number) => void;
  onSave: () => Promise<void>;
  onLoad: () => Promise<void>;
}

export interface HealthTrackerViewModel {
  currentSegments: number;
  maximumSegments: number;
  amount: string;
  amountIsValid: boolean;
  canTakeDamage: boolean;
  canHeal: boolean;
  isDisabled: boolean;
}

export interface HealthTrackerActions {
  onAmountChange: ChangeEventHandler<HTMLInputElement>;
  onTakeDamage: () => void;
  onHeal: () => void;
}
