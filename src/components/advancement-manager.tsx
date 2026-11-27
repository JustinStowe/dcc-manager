'use client';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { advancementAction } from '@/app/campaign/advancement-actions';
import type { SheetContext } from '@/controllers/use-sheet-mutation';
import { useDialogAction } from '@/controllers/use-dialog-action';
import { earnedPoints, pendingPoints, type AdvancementState, type AdvancementEvent, type AdvancementOperation } from '@/domain/advancement';
import { STAT_KEYS, type TutorialStats } from '@/domain/tutorial';
import { SheetModal } from './sheet-modal';
import styles from '@/styles/sheet-controls.module.css';

export interface AdvancementManagerProps {
  context: SheetContext; level: number; floor: number; isGm: boolean;
  state?: AdvancementState; history?: readonly AdvancementEvent[]; stats: TutorialStats; saferoom?: boolean;
}
const labels = { strength: 'Strength', intelligence: 'Intelligence', constitution: 'Constitution', dexterity: 'Dexterity', charisma: 'Charisma' };
function Reason() { return <label>Reason / table notes<input name="reason" required maxLength={500} /></label>; }
export function AdvancementManager({ context, level, floor, isGm, state, history = [], stats, saferoom = false }: AdvancementManagerProps) {
  const [open, setOpen] = useState(false);
  const [allocation, setAllocation] = useState<Record<string, string>>({});
  const [reviewLevel, setReviewLevel] = useState(String(level));
  const [epoch, setEpoch] = useState(0);
  const editVersion = useRef(context.version);
  const mutation = useDialogAction(advancementAction, { ...context });
  const ready = state?.reconciled === true;
  const pending = state && ready ? pendingPoints(level, state) : 0;
  const openSaferoom = saferoom && floor >= 3;
  const available = ready && floor >= 3 ? (openSaferoom ? pending : state.authorized) : 0;
  const selected = STAT_KEYS.reduce((sum, key) => sum + Number(allocation[key] || 0), 0);
  const validAllocation = selected > 0 && selected <= available && STAT_KEYS.every(key => Number.isSafeInteger(Number(allocation[key] || 0)) && Number(allocation[key] || 0) >= 0 && stats[key].base + Number(allocation[key] || 0) <= 10000);
  const reviewMaximum = Number.isSafeInteger(Number(reviewLevel)) && Number(reviewLevel) >= 1 && Number(reviewLevel) <= 250 ? earnedPoints(Number(reviewLevel)) : 0;
  function show() {
    editVersion.current = context.version; mutation.clearError(); setAllocation({});
    setReviewLevel(String(level)); setEpoch(old => old + 1); setOpen(true);
  }
  function close() { if (!mutation.pending) setOpen(false); }
  async function submit(operation: AdvancementOperation, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget, form = new FormData(element);
    let payload: Record<string, unknown> = { reason: form.get('reason') };
    if (operation === 'reconcile') payload = { ...payload, level: Number(form.get('level')), spent: Number(form.get('spent')), confirmed: form.get('confirmed') === 'yes' };
    if (operation === 'award') payload = { ...payload, amount: Number(form.get('amount')), source: form.get('source') };
    if (operation === 'authorize') payload = { ...payload, amount: Number(form.get('amount')), saferoom: form.get('saferoom') === 'yes' };
    if (operation === 'allocate') payload = { allocation: Object.fromEntries(STAT_KEYS.map(key => [key, Number(form.get(key))])) };
    const command = new FormData(); command.set('operation', operation); command.set('payload', JSON.stringify(payload));
    if (await mutation.save(command, editVersion.current, element)) setOpen(false);
  }
  function reconcile(event: FormEvent<HTMLFormElement>) { return submit('reconcile', event); }
  function award(event: FormEvent<HTMLFormElement>) { return submit('award', event); }
  function authorize(event: FormEvent<HTMLFormElement>) { return submit('authorize', event); }
  function allocate(event: FormEvent<HTMLFormElement>) { return submit('allocate', event); }
  function changeReview(event: ChangeEvent<HTMLInputElement>) { setReviewLevel(event.target.value); }
  function changeAllocation(event: ChangeEvent<HTMLInputElement>) { setAllocation(old => ({ ...old, [event.target.name]: event.target.value })); }
  return <>
    <p>{ready ? openSaferoom ? `${pending} pending stat points · saferoom open, all spendable` : `${pending} pending stat points · ${available} authorized for saferoom spending` : 'GM reconciliation required before level awards or stat spending.'}</p>
    <button type="button" className={styles.statToggle} onClick={show}>Manage advancement</button>
    <SheetModal open={open} title="Level advancement" pending={mutation.pending} onClose={close}>
      <div key={epoch}>
      <p>Level {level} · Floor {floor}. Level cap: 250. Each level gained after Level 1 earns 3 stat points. Skills and Spells advance separately.</p>
      {!state ? <p role="alert">Advancement data unavailable. Apply migration 015 and refresh.</p> : !ready ? <>
        <p>Existing stats may already include level gains. The GM must review the level and record points already applied. Reconciliation preserves current stats, health, Mana, Favor, and learned ranks.</p>
        {isGm ? <form onSubmit={reconcile} aria-label="Reconcile advancement"><fieldset className={styles.fields} disabled={mutation.pending}>
          <legend>One-time GM reconciliation</legend>
          <label>Reviewed current level<input name="level" type="number" min={1} max={250} step={1} required value={reviewLevel} onChange={changeReview} /></label>
          {level > 250 && <p>Saved level {level} exceeds the official cap. Enter the reviewed level explicitly.</p>}
          <label>Level-up stat points already included in current stats<input name="spent" type="number" min={0} max={reviewMaximum} step={1} required defaultValue={0} /></label>
          <p>Reviewed lifetime entitlement: {reviewMaximum} points. Exclude race, class, potion, gear, and GM correction bonuses from points spent. Nothing is added to stats by this review.</p>
          <Reason /><label><input name="confirmed" type="checkbox" value="yes" required /> I reviewed the saved stats and previously spent points.</label>
          <button type="submit">Confirm reconciliation</button>
        </fieldset></form> : <p>Your GM must complete reconciliation. Current stats remain in use.</p>}
      </> : <>
        <p>Earned: {earnedPoints(level)} · Spent: {state.spent} · Pending: {pending} · {openSaferoom ? 'Saferoom open: all pending points spendable' : `Authorized: ${available}`}</p>
        {saferoom && floor < 3 && <p>Saferoom open for loot boxes.</p>}
        {floor < 3 && <p>Stat points stay banked on Tutorial Floors 1–2. They become spendable in a GM-opened saferoom on Floor 3 or deeper, including before race/class prerequisite checks.</p>}
        {isGm && <>
          <form onSubmit={award} aria-label="Award levels"><fieldset className={styles.fields} disabled={mutation.pending || level >= 250}>
            <legend>GM level award</legend>
            <label>Levels to add<input name="amount" type="number" min={1} max={Math.max(1, 250 - level)} step={1} defaultValue={1} required /></label>
            <label>Award source<select name="source" defaultValue="two-hour"><option value="two-hour">Two hours of play</option><option value="quest">Quest</option><option value="boss">Boss</option><option value="crawler-kill">Crawler kill</option><option value="grinding">Grinding</option><option value="other">Other GM award</option></select></label>
            <p>Two hours: +1 level. Boss tiers: +1 through +6; GM may adjust. Resolve quest rewards, crawler-kill dice, and productive grinding hours at the table, then enter the final award.</p>
            <Reason /><button type="submit">Award levels</button>
          </fieldset></form>
          {level >= 250 && <p>Maximum level reached.</p>}
          <form onSubmit={authorize} aria-label="Authorize saferoom spending"><fieldset className={styles.fields} disabled={mutation.pending}>
            <legend>GM saferoom authorization</legend>
            <p>Prefer <strong>Saferoom status</strong> in Game management: while it is open, the crawler can spend every pending point on Floor 3+ without this form.</p>
            <label>Total points authorized now<input name="amount" type="number" min={0} max={floor >= 3 ? pending : 0} step={1} defaultValue={state.authorized} required /></label>
            <label><input name="saferoom" type="checkbox" value="yes" /> Crawler is in a saferoom on Floor 3 or deeper (required to authorize points).</label>
            <p>Enter 0 to revoke. This replaces the previous authorization. Revoke when leaving the saferoom; Floor changes close it automatically. Later level awards need separate authorization.</p>
            <Reason /><button type="submit">Save authorization</button>
          </fieldset></form>
          <p>Human level-gain Favor: {state.humanFavor ? 'active' : 'inactive'}. Manage this through Third Floor Race &amp; Class selection. Legacy Human confirmation remains in force until its benefit review.</p>
        </>}
        {available > 0 ? <form onSubmit={allocate} aria-label="Allocate stat points"><fieldset className={styles.fields} disabled={mutation.pending}>
          <legend>{openSaferoom ? 'Distribute pending points' : 'Distribute authorized points'}</legend>
          {STAT_KEYS.map(key => <label key={key}>{labels[key]} · Unenhanced {stats[key].base} → {stats[key].base + Number(allocation[key] || 0)}<input name={key} type="number" min={0} max={Math.min(available, 10000 - stats[key].base)} step={1} required value={allocation[key] ?? '0'} onChange={changeAllocation} /></label>)}
          <p role="status">Selected: {selected} / {available}. Remaining: {available - selected}.</p>
          <p>Apply some or all {openSaferoom ? 'pending' : 'authorized'} points. Enhanced stats recalculate with your current effects and gear. Health and current Mana do not refill.</p>
          <button type="submit" disabled={!validAllocation}>Apply stat points</button>
        </fieldset></form> : <p>{openSaferoom ? 'No pending points to spend.' : 'No points are currently spendable. The GM opens a saferoom to allow spending.'}</p>}
        {isGm && <p>Use this allocation form for level-up spending. General GM stat corrections do not spend or refund advancement points.</p>}
      </>}
      <details><summary>Recent advancement history</summary>
        {history.length ? <ol>{history.slice(0, 20).map(event => <li key={event.id}><strong>{event.summary}</strong><br /><time dateTime={event.at}>{event.at.replace('T', ' ')}</time>{event.reason && <p>{event.reason}</p>}</li>)}</ol> : <p>No recorded advancement events.</p>}
        <p className={styles.hint}>Shows up to 20 events for this crawler from the latest 1,000 campaign events. The complete history is retained.</p>
      </details>
      <div className={styles.actions}><button type="button" onClick={close} disabled={mutation.pending}>Close</button></div>
      {mutation.pending && <p role="status">Saving…</p>}{mutation.error && <p className={styles.error} role="alert">{mutation.error}</p>}
      </div>
    </SheetModal>
  </>;
}
