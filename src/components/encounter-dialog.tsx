'use client';

import { useRef, useState, type ReactNode } from 'react';
import styles from '@/styles/campaign.module.css';
import { ThemeSwitcher } from './theme-provider';

export function EncounterDialog({ campaignId, active, round, children }: {
  campaignId: string; active: boolean; round: number | null; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const id = `encounter-dialog-${campaignId}`;
  const windowUrl = `/games/${campaignId}/encounter`;
  function openDialog() { dialog.current?.showModal(); setOpen(true); }
  function closeDialog() { dialog.current?.close(); }
  function dialogClosed() { setOpen(false); trigger.current?.focus(); }
  function openWindow() {
    const detached = window.open(windowUrl, `dcc-encounter-${campaignId}`, 'popup=yes,width=900,height=800,resizable=yes,scrollbars=yes');
    if (detached) {
      setPopupBlocked(false);
      detached.focus();
      dialog.current?.close();
    } else {
      setPopupBlocked(true);
    }
  }
  return <>
    <div className={styles.encounterLaunchers}>
      <button ref={trigger} type="button" className={styles.encounterTrigger}
        aria-haspopup="dialog" aria-controls={id} aria-expanded={open}
        onClick={openDialog}>
        Encounter tracker{active && round !== null ? ` · Round ${round}` : ''}
      </button>
      <button type="button" className={styles.encounterTrigger} onClick={openWindow}>Open separate window</button>
    </div>
    {popupBlocked && <p role="alert" className={styles.encounterPopupFallback}>The browser blocked the encounter window. <a href={windowUrl} target="_blank" rel="noopener noreferrer">Open the tracker in a new tab</a>, then move that tab to another window.</p>}
    <dialog ref={dialog} id={id} className={styles.encounterDialog} aria-label="Encounter tracker"
      onClose={dialogClosed}>
      <div className={styles.encounterDialogTop}>
        <ThemeSwitcher compact />
        <button type="button" onClick={openWindow}>Open separate window</button>
        <button type="button" onClick={closeDialog}>Close</button>
      </div>
      {children}
    </dialog>
  </>;
}
