'use client';

import { useActionState } from 'react';
import { lobbyAction } from '@/app/lobby/actions';
import type { CampaignFormState } from '@/services/campaign-workspace';

const initialState: CampaignFormState = { error: null, notice: null };
export function useLobbyFormController() {
  const [state, onSubmit, isPending] = useActionState(lobbyAction, initialState);
  return { model: { ...state, isPending }, actions: { onSubmit } };
}
