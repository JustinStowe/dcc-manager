import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadGameLobby } from '@/adapters/supabase-game-lobby';
import { loadCrawlerProfiles } from '@/adapters/supabase-crawler-profiles';
import { LobbyView } from '@/views/lobby-view';
import { AccountBarView } from '@/views/account-bar-view';
import { signOut } from '@/app/auth/actions';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: {
  searchParams: Promise<{ authError?: string; notice?: string }>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const [lobbyResult, profileResult] = await Promise.allSettled([loadGameLobby(user.id), loadCrawlerProfiles()]);
  const lobby = lobbyResult.status === 'fulfilled' ? lobbyResult.value : { hosted: [], joined: [] };
  const error = lobbyResult.status === 'rejected' ? lobbyResult.reason instanceof Error ? lobbyResult.reason.message : 'Could not load the game lobby.' : null;
  const profiles = profileResult.status === 'fulfilled' ? profileResult.value : [];
  const profileError = profileResult.status === 'rejected' ? profileResult.reason instanceof Error ? profileResult.reason.message : 'Could not load crawler profiles.' : null;
  return (
    <>
      <AccountBarView email={user.email ?? 'Crawler'} signOutFailed={params.authError === 'signout'} onSignOut={signOut} />
      <LobbyView lobby={lobby} error={error} profiles={profiles} profileError={profileError} notice={params.notice === 'game-unavailable' ? 'This game is no longer available. It may have been deleted by its GM.' : null} />
    </>
  );
}
