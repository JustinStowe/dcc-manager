import {STAT_KEYS} from '@/domain/tutorial';
import type {TrackedEffect} from '@/domain/tracked-effects';
import {EffectDefenseFlags} from './effect-defense-flags';
import styles from '@/styles/effect-dialog.module.css';

export function EffectFields({effect}:{effect?:TrackedEffect}){
 return <>
  <div className={styles.twoColumns}><label>Name<input name="name" required maxLength={120} defaultValue={effect?.name??''}/></label><label>Kind<select name="kind" defaultValue={effect?.kind??'buff'}><option value="buff">Buff</option><option value="debuff">Debuff</option><option value="condition">Condition</option></select></label></div>
  <label>Source<input name="source" maxLength={200} defaultValue={effect?.source??''}/></label>
  <label>Notes (visible to player)<textarea name="notes" maxLength={2000} rows={3} defaultValue={effect?.notes??''}/></label>
  <div className={styles.twoColumns}><label>Remaining rounds (blank = no countdown)<input name="rounds" type="number" min={0} max={10000} step={1} defaultValue={effect?.remainingRounds??''}/></label><label className={styles.checkbox}><input name="active" type="checkbox" value="yes" defaultChecked={effect?.active??true}/>Active</label></div>
  <fieldset><legend>Stat changes</legend><div className={styles.statGrid}>{STAT_KEYS.map(key=><label key={key}>{key}<input name={key} type="number" min={-10000} max={10000} step={1} required defaultValue={effect?.modifiers[key]??0}/></label>)}</div></fieldset>
  <EffectDefenseFlags defenses={effect?.defenses}/>
  <p>At zero rounds, the effect must be inactive. Set a positive duration or leave it blank before activating an expired effect. Notes-only conditions remain references for table adjudication.</p>
 </>;
}
