import { CampaignForm } from '@/components/campaign-form';
import { crawlerProfileAction } from '@/app/crawlers/actions';
import type { SavedCrawlerProfile } from '@/services/crawler-profiles';
import styles from '@/styles/campaign.module.css';

export function SavedCrawlerChoices({ campaignId, profiles }: { campaignId: string; profiles: readonly SavedCrawlerProfile[] }) {
  if (!profiles.length) return null;
  return <section aria-label="Saved crawler profiles">
    <h2>Choose a saved crawler</h2>
    <ul className={styles.gameList}>{profiles.map((profile) => <li key={profile.slot}>
      <CampaignForm campaignId={campaignId} submitAction={crawlerProfileAction} label={`Use ${profile.name}`}>
        <input type="hidden" name="operation" value="use-profile" /><input type="hidden" name="slot" value={profile.slot} /><input type="hidden" name="version" value={profile.version} />
        <p>Slot {profile.slot}: {profile.name}</p>
        <button type="submit">Use {profile.name}</button>
      </CampaignForm>
    </li>)}</ul>
  </section>;
}