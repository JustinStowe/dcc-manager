import { getCampaignRole, getCrawlerMaximumHealth, getVisibleCampaignCrawlers } from '@/domain';
import type { CampaignWorkspace } from '@/services/campaign-workspace';
import { CampaignForm } from '@/components/campaign-form';
import { CampaignRefresh } from '@/components/campaign-refresh';
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
          {!creationOnly && crawlers.map(({ crawler, ownerUserId }) => (
            <section className={styles.panel} key={crawler.id}>
              <h2>{crawler.name}</h2>
              {role === 'gm' && <p>Owner: <code className={styles.identifier}>{ownerUserId}</code></p>}
              <p className={styles.health}>Health: <strong>{crawler.currentSegments} / {getCrawlerMaximumHealth(crawler)}</strong></p>
              <p>Base health: {crawler.baseSegments} · Constitution: {crawler.constitution}</p>
              <CampaignForm campaignId={campaign.id} label={`Track health for ${crawler.name}`}>
                <input type="hidden" name="operation" value="health" />
                <input type="hidden" name="crawlerId" value={crawler.id} />
                <input type="hidden" name="version" value={workspace?.versions[crawler.id] ?? ''} />
                <label>Amount<input name="amount" type="number" min={1} max={9007199254740991} step={1} defaultValue={1} required /></label>
                <label>Action<select name="direction" defaultValue="damage"><option value="damage">Take damage</option><option value="heal">Heal</option></select></label>
                <button type="submit">Save health change</button>
              </CampaignForm>
              {role === 'gm' ? (
                <CampaignForm campaignId={campaign.id} key={workspace?.versions[crawler.id]} label={`Edit stats for ${crawler.name}`}>
                  <input type="hidden" name="operation" value="stats" />
                  <input type="hidden" name="crawlerId" value={crawler.id} />
                  <input type="hidden" name="version" value={workspace?.versions[crawler.id] ?? ''} />
                  <label>Base health<input name="baseSegments" type="number" min={1} max={10000} step={1} defaultValue={crawler.baseSegments} required /></label>
                  <label>Constitution<input name="constitution" type="number" min={0} max={10000} step={1} defaultValue={crawler.constitution} required /></label>
                  <p>Stat edits do not heal. Health is clamped if the maximum decreases.</p>
                  <button type="submit">Save stats</button>
                </CampaignForm>
              ) : <p>After creation, your GM controls stat changes. Level-up adjustments will be added later.</p>}
            </section>
          ))}
          {(role === 'gm' ? availableOwnerIds.length > 0 : !hasOwnCrawler) && (
            <section className={styles.panel}>
              <h2>Create a crawler</h2>
              <p>One crawler per account in this first shared campaign. Stats become GM-controlled after creation.</p>
              <CampaignForm campaignId={campaign.id} key={availableOwnerIds.join(',')} label="Create and save crawler">
                <input type="hidden" name="operation" value="create" />
                {role === 'gm' ? <label>Owner<select name="ownerUserId" defaultValue={availableOwnerIds[0]}>{availableOwnerIds.map((id) => <option key={id} value={id}>{id === userId ? 'Me (GM)' : id}</option>)}</select></label> : <input type="hidden" name="ownerUserId" value={userId} />}
                <label>Name<input name="name" type="text" maxLength={200} required /></label>
                <label>Base health<input name="baseSegments" type="number" min={1} max={10000} step={1} defaultValue={10} required /></label>
                <label>Constitution<input name="constitution" type="number" min={0} max={10000} step={1} defaultValue={10} required /></label>
                <button type="submit">Create crawler</button>
              </CampaignForm>
            </section>
          )}
          {!hasOwnCrawler && <LegacyCrawlerImport campaignId={campaign.id} />}
        </>
      )}
    </main>
  );
}
