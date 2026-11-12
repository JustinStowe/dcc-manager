'use client';
import { useState, type FormEvent, type MouseEvent } from 'react';
import type { StatEffect } from '@/domain/sheet';
import { STAT_KEYS } from '@/domain/tutorial';
import { SheetModal } from './sheet-modal';
import { SheetInlineEdit } from './sheet-inline-edit';
import { useSheetMutation, type SheetContext } from '@/controllers/use-sheet-mutation';
import styles from '@/styles/sheet-controls.module.css';
export function StatModifiers({context,effects,defenseBase}:{context:SheetContext;effects:readonly StatEffect[];defenseBase:number}){
  const [open,setOpen]=useState(false);const mutation=useSheetMutation(context);
  function show(){mutation.clearError();setOpen(true);}
  function close(){if(!mutation.pending)setOpen(false);}
  async function add(event:FormEvent<HTMLFormElement>){event.preventDefault();const element=event.currentTarget,form=new FormData(element);if(await mutation.save('effect-add',{name:String(form.get('name')),active:form.get('active')==='yes',modifiers:Object.fromEntries(STAT_KEYS.map((key)=>[key,Number(form.get(key))]))}))element.reset();}
  async function change(event:MouseEvent<HTMLButtonElement>){const data=event.currentTarget.dataset;await mutation.save(data.operation!,data.operation==='effect-toggle'?{id:data.id,active:data.active==='true'}:{id:data.id});}
  return <><button type="button" className={styles.statToggle} onClick={show}>Manage stat modifiers &amp; DR</button><SheetModal open={open} title="GM stat modifiers & DR" pending={mutation.pending} onClose={close}>
    <p>Enhanced stats = Unenhanced + active signed modifiers + equipped gear. Record each source once. Increasing a maximum never refills Mana; decreases clamp current Mana. Health slots stay unchanged.</p>
    <p>Non-gear DR: <SheetInlineEdit context={context} field="defense" label="Non-gear DR" value={defenseBase} editable min={0} max={10000} /></p>
    <ul>{effects.map((effect)=><li key={effect.id}><strong>{effect.name}</strong> · {effect.active?'Active':'Inactive'}<p>{STAT_KEYS.map((key)=>`${key} ${effect.modifiers[key]>=0?'+':''}${effect.modifiers[key]}`).join(' · ')}</p><div className={styles.actions}><button type="button" data-operation="effect-toggle" data-id={effect.id} data-active={String(!effect.active)} onClick={change} disabled={mutation.pending}>{effect.active?'Deactivate':'Activate'}</button><button type="button" data-operation="effect-remove" data-id={effect.id} onClick={change} disabled={mutation.pending}>Remove modifier</button></div></li>)}</ul>
    <form onSubmit={add}><fieldset className={styles.fields} disabled={mutation.pending}><legend>Add a buff / debuff modifier</legend><label>Source name<input name="name" maxLength={120} required /></label>{STAT_KEYS.map((key)=><label key={key}>{key}<input name={key} type="number" min={-10000} max={10000} step={1} defaultValue={0} required /></label>)}<label><input type="checkbox" name="active" value="yes" defaultChecked /> Active</label><button type="submit" disabled={effects.length>=100}>Add modifier</button></fieldset></form>
    {mutation.pending&&<p role="status">Saving…</p>}{mutation.error&&<p className={styles.error} role="alert">{mutation.error}</p>}<button type="button" onClick={close} disabled={mutation.pending}>Done</button>
  </SheetModal></>;
}
