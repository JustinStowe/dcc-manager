import { getCampaignRole, getCrawlerMaximumHealth } from '@/domain';
import { getDashboardCrawlers } from '@/models/campaign-dashboard';
import type { CampaignWorkspace } from '@/services/campaign-workspace';
import { CampaignForm } from '@/components/campaign-form';
import { CampaignRefresh } from '@/components/campaign-refresh';
import { TutorialCreation } from '@/components/tutorial-creation';
import { TutorialSheetView } from '@/views/tutorial-sheet-view';
import styles from '@/styles/campaign.module.css';
import Link from 'next/link';
import { formatGameCode, type HostSettings } from '@/services/game-lobby';
import { SavedCrawlerChoices } from '@/components/saved-crawler-choices';
import { DeleteGame } from '@/components/delete-game';
import type { SavedCrawlerProfile } from '@/services/crawler-profiles';

export function CampaignView({ workspace, userId, storageError, hostSettings, profiles, creationOnly = false, selectedCrawlerId }: {
  workspace: CampaignWorkspace | null; userId: string; storageError: string | null;
  hostSettings?: HostSettings | null; creationOnly?: boolean;
  profiles?: readonly SavedCrawlerProfile[];
  selectedCrawlerId?: string;
}) {
  const campaign = workspace?.campaign ?? null;
  const role = campaign ? getCampaignRole(campaign, userId) : null;
  const { visible: crawlers, selected } = getDashboardCrawlers(campaign, userId, selectedCrawlerId);
  const hasOwnCrawler = crawlers.some((entry) => entry.ownerUserId === userId);
  const ownerIds = campaign ? [campaign.gmUserId, ...campaign.playerUserIds] : [];
  const availableOwnerIds = ownerIds.filter((id) => !crawlers.some((entry) => entry.ownerUserId === id));
  return (
    <main className={`${styles.page} ${styles.dashboard}`}>
      <Link href="/" className={styles.backLink}>Back to game lobby</Link>
      <div className={styles.dashboardHeader}>
        <div><p className={styles.eyebrow}>Dungeon Crawler Carl · campaign</p><h1>{campaign?.name ?? 'Your campaign'}</h1></div>
        <p className={styles.roleBadge}>{creationOnly ? 'Crawler creation' : role === 'gm' ? 'You are the GM' : 'Your crawler record'}</p>
        <CampaignRefresh />
      </div>
      {storageError ? <p role="alert" className={styles.error}>{storageError}</p> : !campaign ? (
        <section className={styles.panel}><h2>Game access unavailable</h2><p>Return to the lobby and enter a valid Game Code from your GM.</p></section>
      ) : (
        <>
          <p className={styles.dashboardHint}>Changes save to this game. Refresh campaign to see another session’s updates.</p>
          {role === 'gm' && (
            <section className={`${styles.panel} ${styles.gameManagement}`} aria-label="Game management">
              <div>
              {hostSettings && (
                <>
                  <h2>Game Code</h2>
                  <p><code className={styles.gameCode}>{formatGameCode(hostSettings.code)}</code></p>
                  <p>Share this code with players. Joining is {hostSettings.acceptingPlayers ? 'open' : 'paused'}.</p>
                  <CampaignForm campaignId={campaign.id} label="Manage Game Code joining">
                    <input type="hidden" name="operation" value="set-joining" />
                    <input type="hidden" name="accepting" value={hostSettings.acceptingPlayers ? 'false' : 'true'} />
                    <button type="submit">{hostSettings.acceptingPlayers ? 'Pause new joins' : 'Open new joins'}</button>
                  </CampaignForm>
                </>
              )}
              </div><div>
              <h2>Players <span className={styles.countBadge}>{campaign.playerUserIds.length}</span></h2>
              <p>Players join with your Game Code and can view only their own crawler. Refresh to see new arrivals.</p>
              <ul>{campaign.playerUserIds.map((id) => <li key={id}>{campaign.crawlers.find((entry) => entry.ownerUserId === id)?.crawler.name ?? 'Awaiting crawler creation'}</li>)}</ul>
              <details className={styles.dangerZone}><summary>Delete this game</summary><DeleteGame game={{ id: campaign.id, name: campaign.name }} /></details>
              </div>
            </section>
          )}
          {crawlers.length === 0 && <p>No crawlers are available to your account yet.</p>}
          {!creationOnly && crawlers.length > 0 && <nav className={styles.crawlerTabs} aria-label={role === 'gm' ? 'Select a crawler' : 'Your crawler'}>
            {crawlers.map(({ crawler }) => <Link key={crawler.id} href={`/games/${campaign.id}?crawler=${crawler.id}#crawler-record`} prefetch={false} aria-current={selected?.crawler.id === crawler.id ? 'page' : undefined}>{crawler.name}</Link>)}
          </nav>}
          {!creationOnly && selected && [selected].map(({ crawler, ownerUserId }) => {
            const official = workspace?.tutorials?.[crawler.id];
            const version = workspace?.versions[crawler.id] ?? '';
            if (official) return <TutorialSheetView key={crawler.id} crawler={crawler} profile={official.profile} number={official.number} version={version} isGm={role === 'gm'} inventory={workspace?.inventories?.[crawler.id] ?? []} loadout={workspace?.loadouts?.[crawler.id]} learned={workspace?.skills?.[crawler.id]} />;
            const maximum = getCrawlerMaximumHealth(crawler);
            return <section className={styles.panel} id="crawler-record" key={crawler.id}>
              <h2>{crawler.name} — prototype needs GM review</h2>
              <p>Recorded prototype health: {crawler.currentSegments}/{maximum}. These values used the earlier prototype calculation. They have not been converted automatically.</p>
              {role === 'gm' ? <details><summary>Review and convert to Level 1 Tutorial rules</summary>
                <TutorialCreation key={version} campaignId={campaign.id} owners={[{ id: ownerUserId, label: crawler.name }]} conversion={{ id: crawler.id, version, name: crawler.name, slots: Math.floor(crawler.currentSegments / maximum * 10), oldHealth: `${crawler.currentSegments}/${maximum}` }} />
              </details> : <p>Your GM must review and convert this crawler before using the official Tutorial tracker.</p>}
            </section>;
          })}
          {!hasOwnCrawler && <SavedCrawlerChoices campaignId={campaign.id} profiles={profiles ?? []} />}
          {(role === 'gm' ? availableOwnerIds.length > 0 : !hasOwnCrawler) && <details open={!profiles?.length}>
            <summary className={styles.subchoice}>Create a fresh crawler</summary>
            <TutorialCreation key={availableOwnerIds.join(',')} campaignId={campaign.id} owners={(role === 'gm' ? availableOwnerIds : [userId]).map((id) => ({ id, label: id === userId ? 'Me' : `Player ${id.slice(0, 8)}` }))} currentUserId={userId} emptyProfileSlots={profiles ? [1, 2, 3].filter((slot) => !profiles.some((profile) => profile.slot === slot)) : []} />
          </details>}
        </>
      )}
    </main>
  );
}
