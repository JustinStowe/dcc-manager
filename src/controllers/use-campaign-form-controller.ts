'use client';

import { useActionState } from 'react';
import { campaignAction } from '@/app/campaign/actions';
import type { CampaignFormState } from '@/services/campaign-workspace';

const initialState: CampaignFormState = { error: null, notice: null };

export function useCampaignFormController(action: typeof campaignAction = campaignAction) {
  const [state, onSubmit, isPending] = useActionState(action, initialState);
  return { model: { ...state, isPending }, actions: { onSubmit } };
}
