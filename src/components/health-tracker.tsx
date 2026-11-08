import type { Crawler } from '@/domain';
import { useHealthController } from '@/controllers/use-health-controller';
import { HealthTrackerView } from '@/views/health-tracker-view';

interface HealthTrackerProps {
  crawler: Crawler;
  onHealthChange: (adjustment: number) => void;
  disabled: boolean;
}

export function HealthTracker({ crawler, onHealthChange, disabled }: HealthTrackerProps) {
  const { model, actions } = useHealthController(crawler, onHealthChange, disabled);

  return <HealthTrackerView model={model} actions={actions} />;
}
