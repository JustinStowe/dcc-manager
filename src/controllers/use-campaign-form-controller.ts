'use client';

import { useActionState } from 'react';
import { campaignAction } from '@/app/campaign/actions';
import type { CampaignFormState } from '@/services/campaign-workspace';

const initialState: CampaignFormState = { error: null, notice: null };

export function useCampaignFormController() {
  const [state, onSubmit, isPending] = useActionState(campaignAction, initialState);
  return { model: { ...state, isPending }, actions: { onSubmit } };
}
