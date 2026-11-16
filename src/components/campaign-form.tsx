'use client';

import { useEffect,useRef,type ReactNode } from 'react';
import { announceFormSaved } from '@/controllers/live-edit-guard';
import { useCampaignFormController } from '@/controllers/use-campaign-form-controller';
import styles from '@/styles/campaign.module.css';
import type { CampaignFormState } from '@/services/campaign-workspace';

export function CampaignForm({ children, label, campaignId, submitAction }: { children: ReactNode; label: string; campaignId: string; submitAction?: (previous: CampaignFormState, form: FormData) => Promise<CampaignFormState> }) {
  const { model, actions } = useCampaignFormController(submitAction);
  const ref=useRef<HTMLFormElement>(null);
  useEffect(()=>{if(!model.isPending&&model.notice)announceFormSaved(ref.current);},[model.isPending,model.notice]);
  return (
    <form ref={ref} action={actions.onSubmit} className={styles.form} aria-label={label} aria-busy={model.isPending}>
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
