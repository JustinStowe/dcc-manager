'use client';
import { useState, useRef, type FormEvent } from 'react';
import { SheetModal } from './sheet-modal';
import { useSheetMutation, type SheetContext } from '@/controllers/use-sheet-mutation';
import styles from '@/styles/sheet-controls.module.css';
export function FavorManager({context,favor,isGm}:{context:SheetContext;favor:number;isGm:boolean}){
  const [open,setOpen]=useState(false);const mutation=useSheetMutation(context);const editVersion=useRef(context.version);
  function show(){editVersion.current=context.version;mutation.clearError();setOpen(true);}
  function close(){if(!mutation.pending)setOpen(false);}
  async function use(){if(await mutation.save('favor-use',{},editVersion.current))setOpen(false);}
  async function award(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);if(await mutation.save('favor-award',{amount:Number(form.get('amount'))},editVersion.current))setOpen(false);}
  return <><button className={styles.resourceButton} type="button" onClick={show} aria-label={`Manage AI Favor: ${favor}`}><span>AI Favor</span><strong>{favor}</strong></button><SheetModal open={open} title="AI Favor" pending={mutation.pending} onClose={close}>
    <p>Use once per Check for a reroll before the result (never a Natural 1), or once per round for an extra non-Attack Action.</p><p>Available: {favor}</p>
    <div className={styles.actions}><button type="button" onClick={use} disabled={mutation.pending||favor<1}>Use AI Favor</button><button type="button" onClick={close} disabled={mutation.pending}>Cancel</button></div>
    {isGm&&<form onSubmit={award}><fieldset className={styles.fields} disabled={mutation.pending}><legend>GM award</legend><label>AI Favor to add<input name="amount" type="number" min={1} max={2147483647-favor} required step={1} defaultValue={1} /></label><button type="submit" disabled={favor===2147483647}>Accept</button></fieldset></form>}
    {mutation.pending&&<p role="status">Saving…</p>}{mutation.error&&<p className={styles.error} role="alert">{mutation.error}</p>}
  </SheetModal></>;
}
