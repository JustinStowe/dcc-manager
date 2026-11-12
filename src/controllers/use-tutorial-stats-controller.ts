'use client';

import { useState, type ChangeEvent } from 'react';
import { STAT_KEYS, type TutorialStats } from '@/domain/tutorial';

export function useTutorialStatsController(initial: TutorialStats) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(STAT_KEYS.map((key) => [`${key}_base`, String(initial[key].base)])));
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    if (Object.hasOwn(values, name)) setValues((previous) => ({ ...previous, [name]: value }));
  }
  const stats = Object.fromEntries(STAT_KEYS.map((key) => [key, { base: Number(values[`${key}_base`]), enhanced: Number(values[`${key}_base`]) }])) as TutorialStats;
  return { model: { values, stats }, actions: { onChange: handleChange } };
}
