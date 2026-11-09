import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthenticationGateway } from '@/services/authentication';
import { createClient } from '@/utils/supabase/server';

export async function createAuthenticationGateway(): Promise<AuthenticationGateway> {
  const supabase = createClient(await cookies());
  return {
    async signIn(credentials) {
      const { error } = await supabase.auth.signInWithPassword(credentials);
      return { error: error !== null };
    },
    async signUp(credentials) {
      const { data, error } = await supabase.auth.signUp(credentials);
      return { error: error !== null, hasSession: data.session !== null };
    },
    async signOut() {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      return { error: error !== null };
    },
  };
}

export async function getCurrentUser() {
  const supabase = createClient(await cookies());
  // Fetch a server-confirmed user; do not trust getSession().user.
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
