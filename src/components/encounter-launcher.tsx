'use client';

import { useState } from 'react';
import styles from '@/styles/campaign.module.css';

export function EncounterLauncher({ campaignId, active, round }: {
  campaignId: string; active: boolean; round: number | null;
}) {
  const [popupBlocked, setPopupBlocked] = useState(false);
  const windowUrl = `/games/${campaignId}/encounter`;
  function openWindow() {
    const detached = window.open(windowUrl, `dcc-encounter-${campaignId}`, 'popup=yes,width=900,height=800,resizable=yes,scrollbars=yes');
    if (detached) {
      setPopupBlocked(false);
      detached.focus();
    } else {
      setPopupBlocked(true);
    }
  }
  return <>
    <div className={styles.encounterLaunchers}>
      <button type="button" className={styles.encounterTrigger} onClick={openWindow}>
        Encounter tracker{active && round !== null ? ` · Round ${round}` : ''}
      </button>
    </div>
    {popupBlocked && <p role="alert" className={styles.encounterPopupFallback}>The browser blocked the encounter window. <a href={windowUrl} target="_blank" rel="noopener noreferrer">Open the tracker in a new tab</a>, then move that tab to another window.</p>}
  </>;
}