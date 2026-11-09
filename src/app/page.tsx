import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { CrawlerWorkspace } from '@/components/crawler-workspace';
import { AccountBarView } from '@/views/account-bar-view';
import { signOut } from '@/app/auth/actions';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  return (
    <>
      <AccountBarView email={user.email ?? 'Crawler'} signOutFailed={params.authError === 'signout'} onSignOut={signOut} />
      <CrawlerWorkspace />
    </>
  );
}
