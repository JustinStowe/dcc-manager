'use client';

import type { ReactNode } from 'react';
import { useCampaignFormController } from '@/controllers/use-campaign-form-controller';
import styles from '@/styles/campaign.module.css';

export function CampaignForm({ children, label, campaignId }: { children: ReactNode; label: string; campaignId: string }) {
  const { model, actions } = useCampaignFormController();
  return (
    <form action={actions.onSubmit} className={styles.form} aria-label={label} aria-busy={model.isPending}>
      <fieldset disabled={model.isPending} className={styles.fields}>
        <legend>{label}</legend>
        <input type="hidden" name="campaignId" value={campaignId} />
        {children}
      </fieldset>
      {model.isPending && <p role="status">Saving…</p>}
      {model.error && <p role="alert" className={styles.error}>{model.error}</p>}
      {model.notice && <p role="status" className={styles.notice}>{model.notice}</p>}
    </form>
  );
}
