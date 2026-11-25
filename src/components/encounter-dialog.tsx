'use client';

import { useRef, useState, type ReactNode } from 'react';
import styles from '@/styles/campaign.module.css';

export function EncounterDialog({ campaignId, active, round, children }: {
  campaignId: string; active: boolean; round: number | null; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = `encounter-dialog-${campaignId}`;
  function openDialog() { dialog.current?.showModal(); setOpen(true); }
  function closeDialog() { dialog.current?.close(); }
  function dialogClosed() { setOpen(false); trigger.current?.focus(); }
  return <>
    <button ref={trigger} type="button" className={styles.encounterTrigger}
      aria-haspopup="dialog" aria-controls={id} aria-expanded={open}
      onClick={openDialog}>
      Encounter tracker{active && round !== null ? ` · Round ${round}` : ''}
    </button>
    <dialog ref={dialog} id={id} className={styles.encounterDialog} aria-label="Encounter tracker"
      onClose={dialogClosed}>
      <div className={styles.encounterDialogTop}>
        <button type="button" onClick={closeDialog}>Close</button>
      </div>
      {children}
    </dialog>
  </>;
}
