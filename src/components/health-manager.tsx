'use client';
import { useState, useRef, type FormEvent, type MouseEvent } from 'react';
import { DAMAGE_TYPES, type DamagePart } from '@/domain/sheet';
import { SheetModal } from './sheet-modal';
import { useSheetMutation, type SheetContext } from '@/controllers/use-sheet-mutation';
import styles from '@/styles/sheet-controls.module.css';
export function HealthManager({context,slots,constitution,dr}:{context:SheetContext;slots:number;constitution:number;dr:number}){
  const [open,setOpen]=useState(false),[tab,setTab]=useState('damage'),[count,setCount]=useState(1);const mutation=useSheetMutation(context);const editVersion=useRef(context.version);
  function show(){editVersion.current=context.version;mutation.clearError();setCount(1);setTab('damage');setOpen(true);}
  function close(){if(!mutation.pending)setOpen(false);}
  function choose(event:MouseEvent<HTMLButtonElement>){mutation.clearError();setTab(event.currentTarget.dataset.tab!);}
  function add(){setCount(count+1);}
  function remove(){setCount(count-1);}
  async function apply(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);let ok:boolean;
    if(tab==='healing')ok=await mutation.save('healing',{amount:Number(form.get('amount'))},editVersion.current);
    else{const parts=Array.from({length:count},(_,i)=>({type:String(form.get(`type-${i}`)),amount:Number(form.get(`amount-${i}`))})) as DamagePart[];ok=await mutation.save('damage',{parts},editVersion.current);}
    if(ok)setOpen(false);
  }
  return <><button className={styles.manage} type="button" onClick={show}>Manage</button><SheetModal open={open} title="Manage health" pending={mutation.pending} onClose={close}>
    <div className={styles.tabs} role="group" aria-label="Health action"><button type="button" data-tab="damage" aria-pressed={tab==='damage'} onClick={choose} disabled={mutation.pending}>Damage</button><button type="button" data-tab="healing" aria-pressed={tab==='healing'} onClick={choose} disabled={mutation.pending}>Healing</button></div>
    <form onSubmit={apply}><fieldset disabled={mutation.pending} className={styles.fields}><legend>{tab==='damage'?'Damage':'Healing'}</legend>
      {tab==='damage'?<><p>Current health: {slots}/10 slots, Enhanced Constitution {constitution}. DR {dr} is deducted once per distinct damage type in this hit. Armor Piercing ignores DR. Net portions combine before conversion to health slots; separate hits must be entered separately.</p><p className={styles.hint}>Elemental resistance, vulnerability, immunity, and other special defenses remain table adjustments; this calculator applies general DR only.</p>
      {Array.from({length:count},(_,i)=><div key={i} className={styles.damageRow}><label>Damage type {i+1}<select name={`type-${i}`} required defaultValue="Bludgeoning">{DAMAGE_TYPES.map((type)=><option key={type}>{type}</option>)}</select></label><label>Damage amount<input name={`amount-${i}`} type="number" min={1} max={1000000000} step={1} required defaultValue={1} /></label></div>)}
      <div className={styles.actions}><button type="button" onClick={add} disabled={count>=30}>Add damage type</button><button type="button" onClick={remove} disabled={count<=1}>Remove last type</button></div></>:<label>Health slots to restore<input name="amount" type="number" min={1} max={10} step={1} required defaultValue={1} /></label>}
      <div className={styles.actions}><button type="submit">Apply</button><button type="button" onClick={close}>Cancel</button></div>
    </fieldset></form>{mutation.pending&&<p role="status">Saving…</p>}{mutation.error&&<p className={styles.error} role="alert">{mutation.error}</p>}
  </SheetModal></>;
}
