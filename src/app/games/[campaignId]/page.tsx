import { notFound, redirect } from 'next/navigation';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { loadHostSettings } from '@/adapters/supabase-game-lobby';
import { getGameEntry } from '@/services/game-lobby';
import { requireUuid } from '@/services/campaign-workspace';
import type { CampaignWorkspace } from '@/services/campaign-workspace';
import type { HostSettings } from '@/services/game-lobby';
import { AccountBarView } from '@/views/account-bar-view';
import { CampaignView } from '@/views/campaign-view';
import { signOut } from '@/app/auth/actions';

export const dynamic = 'force-dynamic';

export default async function GamePage({ params }: { params: Promise<{ campaignId: string }> }) {
  const user = await requireCurrentUser();
  let campaignId: string;
  try { campaignId = requireUuid((await params).campaignId); }
  catch { notFound(); }
  let workspace: CampaignWorkspace | null = null;
  let settings: HostSettings | null = null;
  let storageError: string | null = null;
  try {
    workspace = await loadCampaignWorkspace(user.id, campaignId);
    if (getGameEntry(workspace) === 'gm') {
      settings = await loadHostSettings(campaignId);
    }
  } catch (error) { storageError = error instanceof Error ? error.message : 'Could not load this game.'; }
  const entry = workspace ? getGameEntry(workspace) : 'unavailable';
  if (!storageError && entry === 'unavailable') notFound();
  if (entry === 'create') {
    redirect(`/games/${campaignId}/create`);
  }
  return (
    <>
      <AccountBarView email={user.email ?? 'Crawler'} signOutFailed={false} onSignOut={signOut} />
      <CampaignView workspace={workspace} userId={user.id} storageError={storageError} hostSettings={settings} />
    </>
  );
}
