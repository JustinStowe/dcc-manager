'use client';

import { useRef, useState, type FormEvent } from 'react';
import { changeHud } from '@/app/campaign/hud-actions';
import { ALERT_CATEGORIES, timerSeconds, type FloorTimer, type HudCommand, type HudSnapshot } from '@/domain/hud';
import styles from '@/styles/game-hud.module.css';

export function useHudMutation(campaignId: string, onSaved: (snapshot?: HudSnapshot | null) => void, onPending?: (pending: boolean) => void) {
  const [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null), locked = useRef(false);
  async function save(command: HudCommand) {
    if (locked.current) return false;
    locked.current = true; setPending(true); setError(null); onPending?.(true);
    try {
      const result = await changeHud(campaignId, command);
      if (result.error) { setError(result.error); return false; }
      onSaved('snapshot' in result ? result.snapshot : null); return true;
    } catch { setError('Could not save. Check your connection and try again.'); return false; }
    finally { locked.current = false; setPending(false); onPending?.(false); }
  }
  return { pending, error, save };
}

export function BroadcastForm({ campaignId, crawlers, onSaved, onPending, initiallyOpen = false }: { campaignId: string; crawlers: readonly { id: string; name: string }[]; onSaved: () => void; onPending?: (pending: boolean) => void; initiallyOpen?: boolean }) {
  const mutation = useHudMutation(campaignId, onSaved, onPending), requestId = useRef<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    requestId.current ??= crypto.randomUUID();
    if (await mutation.save({ operation: 'broadcast', requestId: requestId.current, category: String(data.get('category')) as typeof ALERT_CATEGORIES[number], title: String(data.get('title')), body: String(data.get('body')), crawlerId: String(data.get('crawlerId')) || null })) {
      requestId.current = null; form.reset(); setNotice('Alert sent.');
      document.dispatchEvent(new CustomEvent('dcc:form-saved', { detail: { form } }));
    }
  }
  return <details open={initiallyOpen} className={styles.compose}><summary>GM broadcast</summary><form onSubmit={submit}>
    <fieldset disabled={mutation.pending} className={styles.fields}>
      <label>Send to<select name="crawlerId"><option value="">All Crawlers</option>{crawlers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Category<select name="category">{ALERT_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Title<input name="title" required maxLength={120} placeholder="A message from the System…" /></label>
      <label>Message<textarea name="body" required maxLength={2000} rows={3} /></label>
      <button type="submit">{mutation.pending ? 'Sending…' : 'Send alert'}</button>
    </fieldset>
    {mutation.error && <p role="alert">{mutation.error}</p>}{notice && <p role="status">{notice}</p>}
  </form></details>;
}

export function TimerControls({ campaignId, floor, timer, onSaved, onPending }: { campaignId: string; floor: number; timer: FloorTimer | null; onSaved: () => void; onPending?: (pending: boolean) => void }) {
  // The opening version stays fixed while the GM edits; a remote change must fail safely.
  const [opening, setOpening] = useState(timer);
  const [saved, setSaved] = useState(false);
  function accepted(snapshot?: HudSnapshot | null) {
    if (snapshot?.timer) setOpening({ ...snapshot.timer, remaining: timerSeconds(snapshot.timer, Date.parse(snapshot.serverNow)) ?? 0 });
    setSaved(true); onSaved();
  }
  const mutation = useHudMutation(campaignId, accepted, onPending);
  async function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    const seconds = Number(data.get('days')) * 86400 + Number(data.get('hours')) * 3600 + Number(data.get('minutes')) * 60;
    const start = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'start';
    if (await mutation.save({ operation: 'timer-set', floor, version: opening?.version ?? null, seconds, start })) document.dispatchEvent(new CustomEvent('dcc:form-saved', { detail: { form } }));
  }
  async function control(operation: 'timer-pause' | 'timer-resume' | 'timer-clear') {
    if (opening) await mutation.save({ operation, floor, version: opening.version });
  }
  function pauseOrResume() { void control(opening?.running ? 'timer-pause' : 'timer-resume'); }
  function clear() { void control('timer-clear'); }
  const duration = opening?.remaining ?? 0;
  return <section><p>Only the GM controls the shared Floor {floor} timer. Zero is a table alert; resolve collapse at the table.</p>
    <form key={opening?.version ?? 'new'} onSubmit={edit}><fieldset disabled={mutation.pending} className={styles.fields}><legend>Set remaining time</legend>
      <div className={styles.duration}>
        <label>Days<input name="days" type="number" min="0" max="365" step="1" defaultValue={Math.floor(duration / 86400)} required /></label>
        <label>Hours<input name="hours" type="number" min="0" max="23" step="1" defaultValue={Math.floor(duration % 86400 / 3600)} required /></label>
        <label>Minutes<input name="minutes" type="number" min="0" max="59" step="1" defaultValue={Math.floor(duration % 3600 / 60)} required /></label>
      </div><div className={styles.actions}><button type="submit" value="pause">Save paused</button><button type="submit" value="start">Save &amp; start</button></div>
    </fieldset></form>
    {opening && <div className={styles.actions}><button type="button" disabled={mutation.pending || (!opening.running && opening.remaining === 0)} onClick={pauseOrResume}>{opening.running ? 'Pause timer' : 'Resume timer'}</button><button type="button" disabled={mutation.pending} onClick={clear}>Clear timer</button></div>}
    {saved && <p role="status">Timer saved.</p>}
    {mutation.error && <p role="alert">{mutation.error}</p>}
  </section>;
}
