'use client';

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { readHud } from '@/app/campaign/hud-actions';
import { useHud } from '@/controllers/use-hud';
import { formatCountdown, timerSeconds, type FloorTimer, type HudSnapshot } from '@/domain/hud';
import { BroadcastForm, TimerControls, useHudMutation } from './hud-controls';
import { SheetModal } from './sheet-modal';
import styles from '@/styles/game-hud.module.css';
import rewardStyles from '@/styles/safe-room.module.css';
import { SafeRoomPanel } from './safe-room-panel';

function BannerRegion({ count, children }: { count: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const region = ref.current;
    if (!region?.showPopover) return;
    // A manual popover stays above sheet dialogs without moving focus or blocking edits.
    try { if (count && !region.matches(':popover-open')) region.showPopover(); else if (!count && region.matches(':popover-open')) region.hidePopover(); } catch { /* Older browsers retain the fixed-position banner fallback. */ }
  }, [count]);
  return <div ref={ref} popover="manual" className={styles.banners} aria-live="polite" aria-relevant="additions">{children}</div>;
}

function Countdown({ timer, serverNow }: { timer: FloorTimer | null; serverNow: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = performance.now();
    const tick = window.setInterval(() => setElapsed(performance.now() - started), 1000);
    return () => window.clearInterval(tick);
  }, [serverNow]);
  const remaining = timerSeconds(timer, Date.parse(serverNow) + elapsed);
  return <><strong className={styles.clock}>{formatCountdown(remaining)}</strong><span>{!timer ? 'Awaiting GM' : remaining === 0 ? timer.running ? 'Time expired · GM ruling' : 'Paused · no time remaining' : timer.running ? 'Running' : 'Paused'}</span></>;
}

export function Notifications({ campaignId, floor, snapshot, isGm, crawlers, refresh, onPending, compose = false }: { campaignId: string; floor: number; snapshot: HudSnapshot | null; isGm: boolean; crawlers: readonly { id: string; name: string }[]; refresh: () => void; onPending: (pending: boolean) => void; compose?: boolean }) {
  const mutation = useHudMutation(campaignId, refresh, onPending), [older, setOlder] = useState<HudSnapshot | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null);
  const page = older ?? snapshot;
  async function loadOlder() {
    if (!page?.events.length || loading) return;
    setLoading(true); setError(null);
    try {
      const result = await readHud(campaignId, floor, page.events.at(-1)!.sequence);
      if (result.snapshot) setOlder(result.snapshot); else setError(result.error);
    } catch { setError('Could not load older alerts. Try again.'); }
    finally { setLoading(false); }
  }
  async function mark(sequence: string) {
    if (await mutation.save({ operation: 'read', sequence })) {
      setOlder(current => current ? { ...current, events: current.events.map(e => e.sequence === sequence ? { ...e, readAt: current.serverNow } : e) } : null);
    }
  }
  async function markAll() {
    if (snapshot && await mutation.save({ operation: 'read-all', through: snapshot.head })) setOlder(null);
  }
  function newest() { setOlder(null); }
  function markEvent(event: MouseEvent<HTMLButtonElement>) { void mark(event.currentTarget.dataset.sequence!); }
  return <>
    {isGm && <BroadcastForm campaignId={campaignId} crawlers={crawlers} onSaved={refresh} onPending={onPending} initiallyOpen={compose} />}
    <div className={styles.actions}><p>{snapshot?.unread ?? 0} unread · private to your account</p><button type="button" disabled={!snapshot || !snapshot.unread || mutation.pending} onClick={markAll}>Mark all read</button></div>
    <p className={styles.hint}>Alerts stay here after their banners disappear. Targeted alerts are visible to their recipient and the GM.</p>
    {older && <button type="button" onClick={newest}>Back to newest alerts</button>}
    <ol className={styles.log}>{page?.events.map(event => <li key={event.sequence} className={styles.event} data-unread={!event.readAt}>
      <div className={styles.eventMeta}><span className={styles.category} data-category={event.category}>{event.category}</span><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC</time>{event.floor && <span>Floor {event.floor}</span>}</div>
      <h3>{event.title}</h3><p>{event.body}</p>
      {!event.readAt && <button type="button" data-sequence={event.sequence} disabled={mutation.pending} onClick={markEvent}>Mark read</button>}
    </li>)}</ol>
    {page && !page.events.length && <p>No table alerts yet.</p>}
    {page?.hasMore && <button type="button" disabled={loading} onClick={loadOlder}>{loading ? 'Loading…' : 'Older alerts'}</button>}
    {(error || mutation.error) && <p role="alert">{error || mutation.error}</p>}
  </>;
}

export function GameHudShell({ campaignId, floor, isGm, crawlers, initial, initialError, children, crawlerId, crawlerName = 'Your crawler' }: {
  campaignId: string; floor: number; isGm: boolean; crawlers: readonly { id: string; name: string }[];
  initial: HudSnapshot | null; initialError: string | null; children: ReactNode;
  crawlerId?: string; crawlerName?: string;
}) {
  const hud = useHud(campaignId, floor, initial, initialError);
  const [drawer, setDrawer] = useState<'notifications' | 'timer' | 'safe-room' | null>(null);
  const [saving, setSaving] = useState(false);
  const [compose, setCompose] = useState(false);
  const [timerOpening, setTimerOpening] = useState<FloorTimer | null>(null);
  function showTimer() { setTimerOpening(hud.snapshot?.timer ?? null); setDrawer('timer'); }
  function showNotifications() { setCompose(false); setDrawer('notifications'); }
  function showBroadcast() { setCompose(true); setDrawer('notifications'); }
  function showSafeRoom() { if (crawlerId) setDrawer('safe-room'); }
  function closeDrawer() { if (!saving) setDrawer(null); }
  function dismiss(event: MouseEvent<HTMLButtonElement>) { hud.dismissBanner(event.currentTarget.dataset.sequence!); }
  function viewBanner(event: MouseEvent<HTMLButtonElement>) { showNotifications(); dismiss(event); }
  return <div className={styles.shell}>
    <nav className={styles.bar} aria-label="Crawler HUD">
      <span className={styles.brand}>DUNGEON SYSTEM <small>Floor {floor}</small></span>
      <div className={styles.tools}>
        <button type="button" aria-haspopup="dialog" aria-expanded={drawer === 'notifications'} onClick={showNotifications}>Notifications <span className={styles.badge} aria-label={`${hud.snapshot?.unread ?? 0} unread`}>{hud.snapshot ? hud.snapshot.unread > 99 ? '99+' : hud.snapshot.unread : '—'}</span></button>
        <button type="button" disabled title="Crawler Menus will be available in a future update">Crawler Menus</button>
        <button type="button" disabled={!crawlerId} aria-haspopup="dialog" aria-expanded={drawer === 'safe-room'} onClick={showSafeRoom} title={isGm ? 'Unopened boxes across this game' : 'Your unopened boxes'}>Safe Room / Loot <span className={styles.badge} aria-label={`${hud.snapshot?.unopenedBoxes ?? 0} unopened boxes`}>{hud.snapshot?.unopenedBoxes ?? '—'}</span></button>
        <button type="button" disabled title="Exploration Radar will be available in a future update">Map</button>
        {isGm && <button type="button" aria-haspopup="dialog" onClick={showBroadcast}>Broadcast</button>}
      </div>
      <button type="button" className={styles.timer} aria-haspopup="dialog" aria-expanded={drawer === 'timer'} onClick={showTimer}>
        <span>Floor Collapse</span>{hud.snapshot ? <Countdown key={hud.snapshot.serverNow} timer={hud.snapshot.timer} serverNow={hud.snapshot.serverNow} /> : <strong>Unavailable</strong>}
      </button>
    </nav>
    {hud.error && <p className={styles.problem} role="status">Table alerts unavailable. {isGm ? hud.error : 'The GM may need to update the game setup.'} <button type="button" onClick={hud.refresh}>Retry</button></p>}
    <BannerRegion count={hud.banners.length}>
      {hud.banners.map(event => <aside key={event.sequence} className={styles.banner} data-achievement={event.category === 'Achievement'}>
        <div><small>{event.category === 'Achievement' ? 'NEW ACHIEVEMENT UNLOCKED!' : event.category}</small><strong>{event.title}</strong><p>{event.body}</p></div>
        <div className={styles.actions}><button type="button" data-sequence={event.sequence} onClick={viewBanner}>View alerts</button><button type="button" data-sequence={event.sequence} aria-label={`Dismiss ${event.title}`} onClick={dismiss}>×</button></div>
      </aside>)}
    </BannerRegion>
    {children}
    <SheetModal open={drawer !== null} title={drawer === 'timer' ? `Floor ${floor} · Floor Collapse` : drawer === 'safe-room' ? 'Safe Room · Loot & Achievements' : 'Notifications'} pending={saving} onClose={closeDrawer} className={drawer === 'safe-room' ? rewardStyles.modal : styles.drawer}>
      <fieldset disabled={saving} className={styles.drawerContent}>
      {drawer === 'notifications' && <Notifications campaignId={campaignId} floor={floor} snapshot={hud.snapshot} isGm={isGm} crawlers={crawlers} refresh={hud.refresh} onPending={setSaving} compose={compose} />}
      {drawer === 'timer' && <><div className={styles.timerSummary}>{hud.snapshot && <Countdown key={hud.snapshot.serverNow} timer={hud.snapshot.timer} serverNow={hud.snapshot.serverNow} />}</div>{isGm ? hud.snapshot && <TimerControls campaignId={campaignId} floor={floor} timer={timerOpening} onSaved={hud.refresh} onPending={setSaving} /> : <p>The GM controls the shared countdown. Resolve floor collapse at the table.</p>}</>}
      {drawer === 'safe-room' && crawlerId && <SafeRoomPanel campaignId={campaignId} crawlerId={crawlerId} crawlerName={crawlerName} isGm={isGm} crawlers={crawlers} onPending={setSaving} onChanged={hud.refresh} />}
      </fieldset>
      <button type="button" className={styles.close} disabled={saving} onClick={closeDrawer}>Close</button>
    </SheetModal>
  </div>;
}
