'use client';

import { useState, type ChangeEvent } from 'react';
import {
  getCrawlerMaximumHealth,
  type Crawler,
} from '@/domain';
import type {
  HealthTrackerActions,
  HealthTrackerViewModel,
} from '@/models/crawler-presentation';

export function useHealthController(
  crawler: Crawler,
  onHealthChange: (adjustment: number) => void,
  disabled: boolean,
): {
  model: HealthTrackerViewModel;
  actions: HealthTrackerActions;
} {
  const [amount, setAmount] = useState('1');
  const maximumSegments = getCrawlerMaximumHealth(crawler);
  const numericAmount = Number(amount);
  const amountIsValid =
    amount.trim() !== '' &&
    Number.isSafeInteger(numericAmount) &&
    numericAmount > 0;

  function handleAmountChange(event: ChangeEvent<HTMLInputElement>): void {
    if (disabled) return;
    setAmount(event.target.value);
  }

  function handleTakeDamage(): void {
    if (disabled || !amountIsValid || crawler.currentSegments === 0) return;
    onHealthChange(-numericAmount);
  }

  function handleHeal(): void {
    if (disabled || !amountIsValid || crawler.currentSegments === maximumSegments) return;
    onHealthChange(numericAmount);
  }

  return {
    model: {
      currentSegments: crawler.currentSegments,
      maximumSegments,
      amount,
      amountIsValid,
      canTakeDamage: !disabled && amountIsValid && crawler.currentSegments > 0,
      canHeal: !disabled && amountIsValid && crawler.currentSegments < maximumSegments,
      isDisabled: disabled,
    },
    actions: {
      onAmountChange: handleAmountChange,
      onTakeDamage: handleTakeDamage,
      onHeal: handleHeal,
    },
  };
}
