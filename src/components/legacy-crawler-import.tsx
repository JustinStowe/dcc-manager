'use client';

import { useLegacyImportController } from '@/controllers/use-legacy-import-controller';
import { CampaignForm } from '@/components/campaign-form';
import styles from '@/styles/campaign.module.css';

export function LegacyCrawlerImport({ campaignId }: { campaignId: string }) {
  const { model, actions } = useLegacyImportController();
  return (
    <section className={styles.panel}>
      <h2>Bring your browser save into the campaign</h2>
      <p>This browser save has no account ownership. Import only if it is your crawler. The original save will be kept.</p>
      <button type="button" onClick={actions.onFindSave} disabled={model.isBusy}>Find saved preview crawler</button>
      {model.message && <p role="status">{model.message}</p>}
      {model.crawler && (
        <CampaignForm campaignId={campaignId} label="Import as my crawler">
          <p>{model.crawler.name} — {model.crawler.currentSegments} health segments</p>
          <input type="hidden" name="operation" value="import" />
          <input type="hidden" name="snapshot" value={JSON.stringify(model.crawler)} />
          <button type="submit">Import as my crawler</button>
        </CampaignForm>
      )}
    </section>
  );
}
