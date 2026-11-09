'use client';

import { useActionState } from 'react';
import { signIn, signUp } from '@/app/auth/actions';
import type { AuthActions, AuthFormState, AuthMode, AuthViewModel } from '@/models/auth-presentation';

const initialState: AuthFormState = { error: null, notice: null };

export function useAuthController(mode: AuthMode): { model: AuthViewModel; actions: AuthActions } {
  const action = mode === 'signin' ? signIn : signUp;
  const [state, onSubmit, isPending] = useActionState(action, initialState);
  return { model: { ...state, mode, isPending }, actions: { onSubmit } };
}
