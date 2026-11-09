import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadGameLobby } from '@/adapters/supabase-game-lobby';
import { LobbyView } from '@/views/lobby-view';
import { AccountBarView } from '@/views/account-bar-view';
import { signOut } from '@/app/auth/actions';
import type { GameLobby } from '@/services/game-lobby';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: {
  searchParams: Promise<{ authError?: string; notice?: string }>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  let lobby: GameLobby = { hosted: [], joined: [] };
  let error: string | null = null;
  try { lobby = await loadGameLobby(user.id); }
  catch (failure) { error = failure instanceof Error ? failure.message : 'Could not load the game lobby.'; }
  return (
    <>
      <AccountBarView email={user.email ?? 'Crawler'} signOutFailed={params.authError === 'signout'} onSignOut={signOut} />
      <LobbyView lobby={lobby} error={error} notice={params.notice === 'game-unavailable' ? 'This game is no longer available. It may have been deleted by its GM.' : null} />
    </>
  );
}
