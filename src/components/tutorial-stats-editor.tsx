'use client';

import type { TutorialStats } from '@/domain/tutorial';
import { STAT_KEYS } from '@/domain/tutorial';
import { useTutorialStatsController } from '@/controllers/use-tutorial-stats-controller';

export function TutorialStatsEditor({ initial }: { initial: TutorialStats }) {
  const { model, actions } = useTutorialStatsController(initial);
  return <>
    <input type="hidden" name="stats" value={JSON.stringify(model.stats)} />
    {STAT_KEYS.map((key) => <fieldset key={key}><legend>{key}</legend>{(['base', 'enhanced'] as const).map((part) => <label key={part}>{part === 'base' ? 'Unenhanced' : 'Enhanced'}<input name={`${key}_${part}`} type="number" min={1} max={10000} required value={model.values[`${key}_${part}`]} onChange={actions.onChange} /></label>)}</fieldset>)}
  </>;
}
