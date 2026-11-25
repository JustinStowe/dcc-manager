'use client';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { thirdFloorAction } from '@/app/campaign/third-floor-actions';
import { useDialogAction } from '@/controllers/use-dialog-action';
import type { SheetContext } from '@/controllers/use-sheet-mutation';
import { applySelection, eligiblePair, RACES, CLASSES, SELECTION_ABILITIES, selectionPair, type SelectionOption, type ThirdFloorState } from '@/domain/third-floor';
import type { LearnedAbility } from '@/domain/abilities';
import { STAT_KEYS, type Scores } from '@/domain/tutorial';
import type { TypedDefenses } from '@/domain/typed-defenses';
import { SheetModal } from './sheet-modal';
import styles from '@/styles/sheet-controls.module.css';

export interface ThirdFloorManagerProps {
  context: SheetContext; state?: ThirdFloorState; floor: number; isGm: boolean; advancementReady: boolean;
  bases: Scores; skills: readonly LearnedAbility[]; defenseBase: number; baseDefenses: TypedDefenses;
}
function pairLabel(key: string) { const pair = selectionPair(key); return `${pair.race.name} / ${pair.profession.name}`; }
function abilityName(id: string) { return SELECTION_ABILITIES.find(row => row.id === id)?.name ?? id; }
function Notes() { return <label>Review / selection notes<input name="reason" required maxLength={500} /></label>; }
function Confirmation() { return <label><input name="confirmed" type="checkbox" value="yes" required /> I reviewed the benefits, prerequisites and table-adjudicated conditions.</label>; }
function OptionDetails({ option }: { option: SelectionOption & { earth?: boolean; earthOnly?: boolean; size?: number } }) {
  return <details><summary>{option.name} · Core p. {option.page}</summary>
    <p>{option.earth !== undefined ? `${option.earth ? 'Earth' : 'Alien'} Race · Size ${option.size}` : option.earthOnly ? 'Earth-only Class' : 'Class available to compatible Earth or Alien Races'}</p>
    <p>{STAT_KEYS.filter(key => option.stats[key]).map(key => `${key} ${option.stats[key] > 0 ? '+' : ''}${option.stats[key]}`).join(' · ') || 'No stat changes'}</p>
    <p>{Object.entries(option.skills).map(([id, rank]) => `${abilityName(id)} +${rank}`).join(' · ') || 'No fixed Skill grants'}{option.dr > 0 ? ` · DR +${option.dr}` : ''}</p>
    {Object.entries(option.defenses).map(([type, flags]) => <p key={type}>{type}: {Object.entries(flags ?? {}).filter(([, active]) => active).map(([flag]) => flag).join(', ')}</p>)}
    <p>{option.notes}</p>
  </details>;
}
export function ThirdFloorManager({ context, state, floor, isGm, advancementReady, bases, skills, defenseBase, baseDefenses }: ThirdFloorManagerProps) {
  const [open, setOpen] = useState(false), [epoch, setEpoch] = useState(0);
  const [offers, setOffers] = useState<readonly string[]>(state?.offers ?? []);
  const [pair, setPair] = useState(state?.offers[0] ?? '');
  const [choices, setChoices] = useState<Record<string, string[]>>({});
  const [reviewMode, setReviewMode] = useState('none'), [reviewRace, setReviewRace] = useState('human'), [reviewClass, setReviewClass] = useState('fighter');
  const version = useRef(context.version), mutation = useDialogAction(thirdFloorAction, { ...context });
  const selected = state?.selected;
  const pairs = RACES.flatMap(race => CLASSES.filter(profession => race.earth || !profession.earthOnly).map(profession => `${race.id}|${profession.id}`));
  let profession = null, preview = null, previewError = '';
  if (pair && state?.reviewed && !selected) {
    try { profession = selectionPair(pair).profession; preview = applySelection(state, floor, pair, choices, bases, skills, defenseBase, baseDefenses, 'Third Floor selection'); }
    catch (error) { previewError = error instanceof Error ? error.message : 'Check the benefit choices.'; }
  }
  function show() {
    version.current = context.version; mutation.clearError(); setOffers(state?.offers ?? []); setPair(state?.offers[0] ?? '');
    setChoices({}); setReviewMode('none'); setReviewRace('human'); setReviewClass('fighter'); setEpoch(old => old + 1); setOpen(true);
  }
  function close() { if (!mutation.pending) setOpen(false); }
  function changeOffers(event: ChangeEvent<HTMLInputElement>) {
    const { value, checked } = event.target; setOffers(old => checked ? [...old, value] : old.filter(key => key !== value));
  }
  function clearOffers() { setOffers([]); }
  function changePair(event: ChangeEvent<HTMLSelectElement>) { setPair(event.target.value); setChoices({}); mutation.clearError(); }
  function changeChoice(event: ChangeEvent<HTMLSelectElement>) {
    const { name, value, dataset } = event.target, index = Number(dataset.index);
    setChoices(old => { const values = [...(old[name] ?? [])]; values[index] = value; return { ...old, [name]: values }; });
  }
  function changeReviewMode(event: ChangeEvent<HTMLSelectElement>) { setReviewMode(event.target.value); }
  function changeReviewRace(event: ChangeEvent<HTMLSelectElement>) { setReviewRace(event.target.value); }
  function changeReviewClass(event: ChangeEvent<HTMLSelectElement>) { setReviewClass(event.target.value); }
  async function submit(operation: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const element = event.currentTarget, fields = new FormData(element);
    let payload: Record<string, unknown> = { reason: fields.get('reason'), confirmed: fields.get('confirmed') === 'yes' };
    if (operation === 'review') payload = { ...payload, mode: reviewMode, raceId: reviewRace, classId: reviewClass, raceName: fields.get('raceName'), className: fields.get('className'), size: Number(fields.get('size') ?? 4), move: Number(fields.get('move') ?? 20), step: Number(fields.get('step') ?? 10) };
    if (operation === 'offer') payload = { ...payload, offers };
    if (operation === 'select') payload = { ...payload, pair, choices };
    const form = new FormData(); form.set('operation', operation); form.set('payload', JSON.stringify(payload));
    if (await mutation.save(form, version.current, element)) setOpen(false);
  }
  function review(event: FormEvent<HTMLFormElement>) { return submit('review', event); }
  function offer(event: FormEvent<HTMLFormElement>) { return submit('offer', event); }
  function select(event: FormEvent<HTMLFormElement>) { return submit('select', event); }
  function eligibility(key: string) { try { eligiblePair(key, skills, bases); return ''; } catch (error) { return error instanceof Error ? error.message : 'Requirements not met.'; } }
  return <>
    <p>{selected ? `${selected.raceName} / ${selected.className} · ${selected.mode === 'reconciled' ? 'existing benefits reconciled' : 'benefits applied'}` : !state?.reviewed ? 'GM review of existing benefits required.' : `${state.offers.length} GM-approved choice(s) available.`}</p>
    <button type="button" className={styles.statToggle} onClick={show}>Manage Race &amp; Class</button>
    <SheetModal open={open} title="Third Floor Race & Class" pending={mutation.pending} onClose={close}><div key={epoch}>
      <p>Choose Race and Class together on Floor 3 or deeper. You can allocate authorized level-up points before or after selection. New bonuses to learned Skills stop at Rank 10; existing higher ranks remain.</p>
      {!state ? <p role="alert">Race/Class data unavailable. Apply migration 018 and refresh.</p> : !advancementReady ? <p>Complete the GM level-advancement reconciliation first.</p> : selected ? <>
        <p>{selected.raceName} / {selected.className} is saved for this game. Benefits cannot be applied again.</p>
        <p>{selected.notes}</p><p>Move {selected.move}ft · Step {selected.step}ft · Size {selected.size}. Human level-gain Favor {selected.raceId === 'human' ? 'enabled from this selection onward' : 'not granted by this Race'}.</p>
        {RACES.filter(row => row.id === selected.raceId).map(row => <OptionDetails key={row.id} option={row} />)}
        {CLASSES.filter(row => row.id === selected.classId).map(row => <OptionDetails key={row.id} option={row} />)}
      </> : !state.reviewed ? <>
        <p>Review before offering a new selection. If benefits were already granted manually, finish any missing manual adjustments first, then record the existing identity. Reconciliation adds no stats, ranks, DR, defenses or past Favor. It preserves current resources and spent level-up points.</p>
        {isGm ? <form onSubmit={review} aria-label="Review existing Race/Class benefits"><fieldset className={styles.fields} disabled={mutation.pending}>
          <legend>One-time GM benefit review</legend>
          <label>Existing benefits<select name="mode" value={reviewMode} onChange={changeReviewMode}><option value="none">No Race/Class benefits applied</option><option value="existing">Benefits already applied; record identity only</option></select></label>
          {reviewMode === 'existing' && <>
            <label>Existing Race<select name="raceId" value={reviewRace} onChange={changeReviewRace}>{RACES.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}<option value="manual">Other GM-reviewed Race</option></select></label>
            {reviewRace === 'manual' && <><label>Race name<input name="raceName" maxLength={100} required /></label><label>Size<input name="size" type="number" min={1} max={8} step={1} defaultValue={4} required /></label></>}
            <label>Existing Class<select name="classId" value={reviewClass} onChange={changeReviewClass}>{CLASSES.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}<option value="manual">Other GM-reviewed Class</option></select></label>
            {reviewClass === 'manual' && <label>Class name<input name="className" maxLength={100} required /></label>}
            <label>Reviewed Move (feet)<input name="move" type="number" min={0} max={10000} step={1} defaultValue={20} required /></label>
            <label>Reviewed Step (feet)<input name="step" type="number" min={0} max={10000} step={1} defaultValue={10} required /></label>
            <p>Requires Floor 3 or deeper. This confirms benefits already included in the sheet; it does not retroactively test prerequisites against post-benefit stats.</p>
          </>}
          <Notes /><Confirmation /><button type="submit">Save benefit review</button>
        </fieldset></form> : <p>Your GM must review existing benefits before offering choices.</p>}
      </> : <>
        {floor < 3 && <p>New selection is locked until Floor 3. Tutorial identity remains in use.</p>}
        {isGm && <form onSubmit={offer} aria-label="Offer Race/Class choices"><fieldset className={styles.fields} disabled={mutation.pending}>
          <legend>GM offered pairs · choose up to three</legend>
          <p>Confirm achievements, optional identity restrictions and table requirements before offering pairs. No choice grants benefits until it is selected. Saving an empty list revokes offers; changing Floor also closes them.</p>
          <div className={styles.selectionOffers}>{pairs.map(key => { const error = eligibility(key); return <label key={key}><input name="offer" type="checkbox" value={key} checked={offers.includes(key)} disabled={floor < 3 || (!!error && !offers.includes(key))} onChange={changeOffers} />{pairLabel(key)}{error && <small>{error}</small>}</label>; })}</div>
          <p>{offers.length} / 3 selected</p><button type="button" onClick={clearOffers}>Clear offers</button>
          <Notes /><Confirmation /><button type="submit" disabled={offers.length > 3}>Save offered choices</button>
        </fieldset></form>}
        {floor >= 3 && state.offers.length > 0 ? <form onSubmit={select} aria-label="Select Race and Class"><fieldset className={styles.fields} disabled={mutation.pending}>
          <legend>Choose your Race and Class</legend>
          <label>Offered pair<select value={pair} name="pair" onChange={changePair}>{state.offers.map(key => <option key={key} value={key}>{pairLabel(key)}</option>)}</select></label>
          {pair && <><OptionDetails option={selectionPair(pair).race} /><OptionDetails option={selectionPair(pair).profession} /></>}
          {profession?.choices.map(group => <fieldset key={group.id} className={styles.fields}><legend>{group.label}</legend>{Array.from({ length: group.count }, (_, index) => <label key={index}>{group.label} · choice {index + 1}<select name={group.id} data-index={index} value={choices[group.id]?.[index] ?? ''} onChange={changeChoice} required><option value="">Choose a Skill</option>{group.ids.map(id => <option key={id} value={id}>{abilityName(id)}</option>)}</select></label>)}</fieldset>)}
          {preview ? <><p>Unenhanced stats after selection:</p><ul>{STAT_KEYS.map(key => <li key={key}>{key}: {bases[key]} → {preview.bases[key]}</li>)}</ul><p>Skill ranks after selection:</p><ul>{preview.skills.filter(row => row.rank !== (skills.find(old => old.id === row.id)?.rank ?? 0)).map(row => <li key={row.id}>{row.name}: {skills.find(old => old.id === row.id)?.rank ?? 0} → {row.rank}</li>)}</ul><p>Non-gear DR: {defenseBase} → {preview.defenseBase}. Health does not refill; Mana is preserved and clamps only if its maximum falls.</p></> : <p role="status">{previewError}</p>}
          <Notes /><Confirmation /><button type="submit" disabled={!preview}>Confirm selection and apply benefits once</button>
        </fieldset></form> : <p>No selection is currently authorized.</p>}
      </>}
      <details><summary>Reviewed starter catalog and manual benefits</summary><p>This first catalog covers five Races and four Classes. Stat changes, fixed/choice Skill grants, DR and listed typed defenses are supported. Passive ability bonuses, damage, cooldowns, training coupons, loot, special Actions, flight and conditional effects remain table-adjudicated.</p>
        {RACES.map(row => <OptionDetails key={row.id} option={row} />)}{CLASSES.map(row => <OptionDetails key={row.id} option={row} />)}
      </details>
      <button type="button" onClick={close} disabled={mutation.pending}>Close</button>
      {mutation.pending && <p role="status">Saving…</p>}{mutation.error && <p role="alert" className={styles.error}>{mutation.error}</p>}
    </div></SheetModal>
  </>;
}
