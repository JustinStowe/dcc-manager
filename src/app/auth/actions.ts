'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAuthenticationGateway } from '@/adapters/supabase-authentication';
import { authenticate, endSession } from '@/services/authentication';
import type { AuthFormState, AuthMode } from '@/models/auth-presentation';

async function submit(formData: FormData, mode: AuthMode): Promise<AuthFormState> {
  const email = formData.get('email');
  const password = formData.get('password');
  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'Enter your email and password.', notice: null };
  }
  const gateway = await createAuthenticationGateway();
  const result = await authenticate(gateway, { email, password }, mode);
  if (result.status === 'authenticated') {
    revalidatePath('/', 'layout');
    redirect('/');
  }
  return result.status === 'error'
    ? { error: result.message, notice: null }
    : { error: null, notice: result.message };
}

export async function signIn(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  return submit(formData, 'signin');
}
export async function signUp(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  return submit(formData, 'signup');
}
export async function signOut(): Promise<void> {
  const result = await endSession(await createAuthenticationGateway());
  if (result.status !== 'signed-out') redirect('/?authError=signout');
  revalidatePath('/', 'layout');
  redirect('/login');
}
