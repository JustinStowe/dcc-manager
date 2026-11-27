'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { campaignAction } from '@/app/campaign/actions';
import { DeleteGame } from './delete-game';
import { ThemeToggle } from './theme-provider';
import styles from '@/styles/campaign-header.module.css';

export interface CampaignMenuProps {
  campaignId: string; campaignName: string; isGm: boolean;
  gameCode?: string; acceptingPlayers?: boolean;
}

export function CampaignMenu({ campaignId, campaignName, isGm, gameCode, acceptingPlayers }: CampaignMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  function toggle() { setOpen(value => !value); }
  return <div className={styles.menu} ref={root}>
    <button ref={trigger} type="button" className={styles.menuButton} aria-haspopup="true" aria-expanded={open} aria-controls={panelId} onClick={toggle}>Menu <span aria-hidden="true">▾</span></button>
    <div id={panelId} className={styles.panel} hidden={!open}>
      <section aria-labelledby={`${panelId}-gm`}>
        <h2 id={`${panelId}-gm`} className={styles.sectionTitle}>Game management</h2>
        {!isGm ? <p className={styles.muted}>Only the GM can manage this game.</p> : <>
          {gameCode && <GameCode code={gameCode} />}
          {acceptingPlayers !== undefined && <JoinSwitch campaignId={campaignId} accepting={acceptingPlayers} />}
          <div className={styles.deleteGame}><DeleteGame game={{ id: campaignId, name: campaignName }} /></div>
        </>}
      </section>
      <hr className={styles.divider} />
      <section aria-labelledby={`${panelId}-theme`}>
        <h2 id={`${panelId}-theme`} className={styles.sectionTitle}>Theme</h2>
        <ThemeToggle className={styles.segmented} />
      </section>
    </div>
  </div>;
}

function GameCode({ code }: { code: string }) {
  const [copied, setCopied] = useState<'copied' | 'failed' | null>(null);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied('copied'); }
    catch { setCopied('failed'); }
  }
  return <div className={styles.row}>
    <span className={styles.label}>Game Code</span>
    <div className={styles.codeRow}><code className={styles.code}>{code}</code><button type="button" className={styles.copy} onClick={copy}>Copy</button></div>
    {copied && <p role="status" className={styles.muted}>{copied === 'copied' ? 'Copied to clipboard.' : 'Copy failed. Select the code and copy it manually.'}</p>}
  </div>;
}

function JoinSwitch({ campaignId, accepting }: { campaignId: string; accepting: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function toggle() {
    const form = new FormData();
    form.set('campaignId', campaignId); form.set('operation', 'set-joining'); form.set('accepting', accepting ? 'false' : 'true');
    startTransition(async () => { const result = await campaignAction({ error: null, notice: null }, form); setError(result.error); });
  }
  return <div className={styles.switchRow}>
    <span className={styles.label}>Pause new joins</span>
    <button type="button" role="switch" aria-checked={!accepting} aria-label="Pause new joins" className={styles.switch} disabled={pending} onClick={toggle}>
      <span className={styles.track} aria-hidden="true"><span className={styles.thumb} /></span>
      <span>{pending ? 'Saving…' : accepting ? 'Joins open' : 'Joins paused'}</span>
    </button>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </div>;
}
