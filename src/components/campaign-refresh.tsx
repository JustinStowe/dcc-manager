'use client';

import { useCampaignRefreshController } from '@/controllers/use-campaign-refresh-controller';

export function CampaignRefresh() {
  const { model, actions } = useCampaignRefreshController();
  return <button type="button" onClick={actions.onRefresh} disabled={model.isPending}>{model.isPending ? 'Refreshing…' : 'Refresh campaign'}</button>;
}
