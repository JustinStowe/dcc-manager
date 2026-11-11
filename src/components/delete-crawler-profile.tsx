import { crawlerProfileAction } from '@/app/crawlers/actions';
import { CampaignForm } from '@/components/campaign-form';
import type { SavedCrawlerProfile } from '@/services/crawler-profiles';
import styles from '@/styles/campaign.module.css';

export function DeleteCrawlerProfile({ profile }: { profile: SavedCrawlerProfile }) {
  return (
    <CampaignForm campaignId="" submitAction={crawlerProfileAction} label={`Delete saved crawler ${profile.name}`}>
      <input type="hidden" name="operation" value="delete-profile" />
      <input type="hidden" name="slot" value={profile.slot} />
      <input type="hidden" name="version" value={profile.version} />
      <label><input type="checkbox" name="confirmed" value="yes" required /> Delete this saved crawler. Existing game crawlers will not change.</label>
      <button type="submit" className={styles.danger}>Delete crawler</button>
    </CampaignForm>
  );
}
