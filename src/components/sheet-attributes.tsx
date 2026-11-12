'use client';
import { useState, useRef, type FormEvent } from 'react';
import { STAT_KEYS, tutorialModifier, type TutorialProfile } from '@/domain/tutorial';
import { useSheetMutation, type SheetContext } from '@/controllers/use-sheet-mutation';
import styles from '@/styles/campaign.module.css';
import controls from '@/styles/sheet-controls.module.css';
export function SheetAttributes({context,profile,isGm}:{context:SheetContext;profile:TutorialProfile;isGm:boolean}){
  const [editing,setEditing]=useState(false);const mutation=useSheetMutation(context);const editVersion=useRef(context.version);
  function edit(){editVersion.current=context.version;mutation.clearError();setEditing(true);}
  function cancel(){if(!mutation.pending)setEditing(false);}
  async function confirm(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const bases=Object.fromEntries(STAT_KEYS.map((key)=>[key,Number(form.get(key))]));if(await mutation.save('base-stats',{bases},editVersion.current))setEditing(false);}
  return <aside className={styles.attributeColumn} aria-label="Core attributes"><form onSubmit={confirm}><dl>{STAT_KEYS.map((key)=><div key={key} className={styles.attributeBox}>
    <dt className={controls.statHeading}>{key}{key==='strength'&&isGm&&(editing?<button key="confirm" className={controls.statToggle} type="submit" disabled={mutation.pending}>Confirm</button>:<button key="edit" className={controls.statToggle} type="button" onClick={edit}>Edit</button>)}</dt><dd className={styles.attributePair}><span><b>{profile.stats[key].enhanced}</b><small>Enhanced</small></span><i aria-hidden="true">/</i><span>{editing?<input className={controls.statInput} name={key} aria-label={`Unenhanced ${key}`} type="number" min={1} max={10000} step={1} defaultValue={profile.stats[key].base} required disabled={mutation.pending} />:<b>{profile.stats[key].base}</b>}<small>Unenhanced</small></span></dd><dd className={styles.attributeModifier}><span>{key.slice(0,3).toUpperCase()} MOD</span><strong>+{tutorialModifier(profile.stats[key].enhanced)}</strong></dd>
  </div>)}</dl>{editing&&<button className={controls.statToggle} type="button" onClick={cancel} disabled={mutation.pending}>Cancel edits</button>}{mutation.pending&&<p role="status">Saving…</p>}{mutation.error&&<p className={controls.error} role="alert">{mutation.error}</p>}</form></aside>;
}
