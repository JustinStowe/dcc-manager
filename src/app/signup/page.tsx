import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/adapters/supabase-authentication';
import { AuthForm } from '@/components/auth-form';

export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/');
  return <AuthForm mode="signup" />;
}
