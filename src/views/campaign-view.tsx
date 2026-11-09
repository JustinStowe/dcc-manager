import { getCampaignRole, getCrawlerMaximumHealth, getVisibleCampaignCrawlers } from '@/domain';
import type { CampaignWorkspace } from '@/services/campaign-workspace';
import { CampaignForm } from '@/components/campaign-form';
import { CampaignRefresh } from '@/components/campaign-refresh';
import { TutorialCreation } from '@/components/tutorial-creation';
import { TutorialSheetView } from '@/views/tutorial-sheet-view';
import { LegacyCrawlerImport } from '@/components/legacy-crawler-import';
import styles from '@/styles/campaign.module.css';
import Link from 'next/link';
import { formatGameCode, type HostSettings } from '@/services/game-lobby';

export function CampaignView({ workspace, userId, storageError, hostSettings, creationOnly = false }: {
  workspace: CampaignWorkspace | null; userId: string; storageError: string | null;
  hostSettings?: HostSettings | null; creationOnly?: boolean;
}) {
  const campaign = workspace?.campaign ?? null;
  const role = campaign ? getCampaignRole(campaign, userId) : null;
  const crawlers = campaign ? getVisibleCampaignCrawlers(campaign, userId) : [];
  const hasOwnCrawler = crawlers.some((entry) => entry.ownerUserId === userId);
  const ownerIds = campaign ? [campaign.gmUserId, ...campaign.playerUserIds] : [];
  const availableOwnerIds = ownerIds.filter((id) => !crawlers.some((entry) => entry.ownerUserId === id));
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.backLink}>Back to game lobby</Link>
      <div className={styles.heading}>
        <div><h1>{campaign?.name ?? 'Your campaign'}</h1><p>{creationOnly ? 'Create your crawler for this game' : role === 'gm' ? 'GM dashboard — all campaign crawlers' : 'Your crawler'}</p></div>
        <CampaignRefresh />
      </div>
      <section className={styles.panel}>
        <h2>{role === 'gm' ? 'You are the GM' : 'Your game'}</h2>
        <p>Your role and crawler are specific to this game. Use the lobby to host or join another game.</p>
      </section>
      {storageError ? <p role="alert" className={styles.error}>{storageError}</p> : !campaign ? (
        <section className={styles.panel}><h2>Game access unavailable</h2><p>Return to the lobby and enter a valid Game Code from your GM.</p></section>
      ) : (
        <>
          <p>Changes save to the campaign immediately. Use Refresh campaign to see updates made in other sessions.</p>
          {role === 'gm' && (
            <section className={styles.panel}>
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
              <h2>Players</h2>
              <p>Players join with your Game Code and can view only their own crawler. Refresh to see new arrivals.</p>
              <ul>{campaign.playerUserIds.map((id) => <li key={id}>{campaign.crawlers.find((entry) => entry.ownerUserId === id)?.crawler.name ?? 'Awaiting crawler creation'}</li>)}</ul>
            </section>
          )}
          {crawlers.length === 0 && <p>No crawlers are available to your account yet.</p>}
          {!creationOnly && crawlers.map(({ crawler, ownerUserId }) => {
            const official = workspace?.tutorials?.[crawler.id];
            const version = workspace?.versions[crawler.id] ?? '';
            if (official) return <TutorialSheetView key={crawler.id} crawler={crawler} profile={official.profile} number={official.number} version={version} isGm={role === 'gm'} />;
            const maximum = getCrawlerMaximumHealth(crawler);
            return <section className={styles.panel} key={crawler.id}>
              <h2>{crawler.name} — prototype needs GM review</h2>
              <p>Recorded prototype health: {crawler.currentSegments}/{maximum}. These values used the earlier prototype calculation. They have not been converted automatically.</p>
              {role === 'gm' ? <details><summary>Review and convert to Level 1 Tutorial rules</summary>
                <TutorialCreation key={version} campaignId={campaign.id} owners={[{ id: ownerUserId, label: crawler.name }]} conversion={{ id: crawler.id, version, name: crawler.name, slots: Math.floor(crawler.currentSegments / maximum * 10), oldHealth: `${crawler.currentSegments}/${maximum}` }} />
              </details> : <p>Your GM must review and convert this crawler before using the official Tutorial tracker.</p>}
            </section>;
          })}
          {(role === 'gm' ? availableOwnerIds.length > 0 : !hasOwnCrawler) && <TutorialCreation key={availableOwnerIds.join(',')} campaignId={campaign.id} owners={(role === 'gm' ? availableOwnerIds : [userId]).map((id) => ({ id, label: id === userId ? 'Me' : `Player ${id.slice(0, 8)}` }))} />}
          {!hasOwnCrawler && <LegacyCrawlerImport campaignId={campaign.id} />}
        </>
      )}
    </main>
  );
}
