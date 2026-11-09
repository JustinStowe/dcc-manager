'use client';

import { useActionState, useState, type ChangeEvent } from 'react';
import { deleteGameAction, lobbyAction } from '@/app/lobby/actions';
import type { CampaignFormState } from '@/services/campaign-workspace';

const initialState: CampaignFormState = { error: null, notice: null };
export function useLobbyFormController() {
  const [state, onSubmit, isPending] = useActionState(lobbyAction, initialState);
  return { model: { ...state, isPending }, actions: { onSubmit } };
}

export function useGameDeletionController() {
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState('');
  const [state, onSubmit, isPending] = useActionState(deleteGameAction, initialState);
  function handleBegin() { setConfirming(true); }
  function handleCancel() { setConfirming(false); setName(''); }
  function handleNameChange(event: ChangeEvent<HTMLInputElement>) { setName(event.target.value); }
  return { model: { ...state, confirming, name, isPending }, actions: { onSubmit, onBegin: handleBegin, onCancel: handleCancel, onNameChange: handleNameChange } };
}
