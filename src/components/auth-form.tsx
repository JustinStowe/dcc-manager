'use client';

import { useAuthController } from '@/controllers/use-auth-controller';
import type { AuthMode } from '@/models/auth-presentation';
import { AuthView } from '@/views/auth-view';

export function AuthForm({ mode }: { mode: AuthMode }) {
  const { model, actions } = useAuthController(mode);
  return <AuthView model={model} actions={actions} />;
}
