'use client';

import type { ReactNode } from 'react';
import { useLobbyFormController } from '@/controllers/use-lobby-form-controller';
import styles from '@/styles/campaign.module.css';

export function LobbyForm({ operation, label, children }: { operation: 'host' | 'join'; label: string; children: ReactNode }) {
  const { model, actions } = useLobbyFormController();
  return (
    <form action={actions.onSubmit} className={styles.form} aria-label={label} aria-busy={model.isPending}>
      <fieldset disabled={model.isPending} className={styles.fields}>
        <legend>{label}</legend>
        <input type="hidden" name="operation" value={operation} />
        {children}
        <button type="submit">{model.isPending ? 'Opening game…' : label}</button>
      </fieldset>
      {model.error && <p role="alert" className={styles.error}>{model.error}</p>}
    </form>
  );
}
