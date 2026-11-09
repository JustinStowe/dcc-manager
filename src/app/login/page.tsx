import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/adapters/supabase-authentication';
import { AuthForm } from '@/components/auth-form';
import styles from '@/styles/auth.module.css';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect('/');
  const params = await searchParams;
  return (
    <>
      {params.error === 'confirmation' && <p role="alert" className={styles.banner}>That confirmation link is invalid or expired. Try signing in if your email is already confirmed, or request help from your GM.</p>}
      <AuthForm mode="signin" />
    </>
  );
}
