import Link from 'next/link';
import { requireCurrentUser } from '@/adapters/supabase-authentication';
import { loadCrawlerProfiles } from '@/adapters/supabase-crawler-profiles';
import { signOut } from '@/app/auth/actions';
import { crawlerProfileAction } from './actions';
import { AccountBarView } from '@/views/account-bar-view';
import { CampaignForm } from '@/components/campaign-form';
import { TutorialCreation } from '@/components/tutorial-creation';
import { requireProfileSlot, type SavedCrawlerProfile } from '@/services/crawler-profiles';
import styles from '@/styles/campaign.module.css';

export const dynamic = 'force-dynamic';

export default async function CrawlerProfilesPage({ searchParams }: { searchParams: Promise<{ slot?: string }> }) {
  const user = await requireCurrentUser();
  let profiles: readonly SavedCrawlerProfile[] = [];
  let error: string | null = null;
  let slot = 1;
  try {
    profiles = await loadCrawlerProfiles();
    const rawSlot = (await searchParams).slot;
    slot = rawSlot ? requireProfileSlot(rawSlot) : [1, 2, 3].find((candidate) => !profiles.some((profile) => profile.slot === candidate)) ?? 1;
  } catch (failure) { error = failure instanceof Error ? failure.message : 'Could not load crawler profiles.'; }
  const selected = profiles.find((profile) => profile.slot === slot);
  return <>
    <AccountBarView email={user.email ?? 'Crawler'} signOutFailed={false} onSignOut={signOut} />
    <main className={styles.page}>
      <Link href="/" className={styles.backLink}>Back to game lobby</Link>
      <h1>Create crawler</h1>
      <p>Saved crawler profiles: {profiles.length}/3</p>
      {error ? <p role="alert" className={styles.error}>{error}</p> : <>
        <nav className={styles.profileSlots} aria-label="Crawler profile slots">
          {[1, 2, 3].map((candidate) => {
            const profile = profiles.find((item) => item.slot === candidate);
            return <Link key={candidate} href={`/crawlers?slot=${candidate}`} aria-current={candidate === slot ? 'page' : undefined}>Slot {candidate}: {profile?.name ?? 'Empty'}</Link>;
          })}
        </nav>
        <TutorialCreation key={`${slot}-${selected?.version ?? 'empty'}`} campaignId="" owners={[{ id: user.id, label: 'Me' }]} profileSlot={slot} savedProfile={selected} />
        {selected && <CampaignForm campaignId="" submitAction={crawlerProfileAction} label={`Remove saved profile ${selected.name}`}>
          <input type="hidden" name="operation" value="delete-profile" /><input type="hidden" name="slot" value={slot} /><input type="hidden" name="version" value={selected.version} />
          <label><input type="checkbox" name="confirmed" value="yes" required /> Remove this saved profile. Existing game crawlers will not change.</label>
          <button type="submit" className={styles.danger}>Remove saved profile</button>
        </CampaignForm>}
      </>}
    </main>
  </>;
}