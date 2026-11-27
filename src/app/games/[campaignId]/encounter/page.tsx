import { notFound, redirect } from 'next/navigation';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { CampaignLive } from '@/components/campaign-live';
import { getCampaignRole } from '@/domain';
import { requireUuid } from '@/services/campaign-workspace';
import { EncounterView } from '@/views/encounter-view';
import styles from '@/styles/campaign.module.css';

export const dynamic = 'force-dynamic';

export default async function EncounterPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const user = await requireCurrentUser();
  let campaignId: string;
  try { campaignId = requireUuid((await params).campaignId); }
  catch { notFound(); }

  const workspace = await loadCampaignWorkspace(user.id, campaignId);
  if (!workspace.campaign) redirect('/?notice=game-unavailable');
  if (getCampaignRole(workspace.campaign, user.id) !== 'gm') notFound();

  return <main className={`${styles.page} ${styles.encounterWindow}`}>
    <div className={styles.encounterWindowHeader}>
      <div><p className={styles.eyebrow}>{workspace.campaign.name}</p><h1>Encounter window</h1></div>
    </div>
    <CampaignLive userId={user.id} />
    <EncounterView campaign={workspace.campaign} encounter={workspace.encounter ?? null} />
  </main>;
}
