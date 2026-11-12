'use client';
import type { TutorialStats } from '@/domain/tutorial';
import { STAT_KEYS } from '@/domain/tutorial';
import { useTutorialStatsController } from '@/controllers/use-tutorial-stats-controller';

// Legacy reusable base-only input; Enhanced is never a manually editable field.
export function TutorialStatsEditor({ initial }: { initial: TutorialStats }) {
  const { model, actions } = useTutorialStatsController(initial);
  const bases=Object.fromEntries(STAT_KEYS.map((key)=>[key,{base:Number(model.values[`${key}_base`]),enhanced:Number(model.values[`${key}_base`])}]));
  return <><input type="hidden" name="stats" value={JSON.stringify(bases)} />{STAT_KEYS.map((key)=><label key={key}>Unenhanced {key}<input name={`${key}_base`} type="number" min={1} max={10000} required value={model.values[`${key}_base`]} onChange={actions.onChange} /></label>)}</>;
}
