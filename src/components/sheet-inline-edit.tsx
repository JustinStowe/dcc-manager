'use client';
import { useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { useSheetMutation, type SheetContext } from '@/controllers/use-sheet-mutation';
import styles from '@/styles/sheet-controls.module.css';
export function SheetInlineEdit({context,field,label,value,editable,min=1,max=2147483647,prefix=''}:{context:SheetContext;field:'mana'|'name'|'number'|'level'|'floor'|'defense';label:string;value:string|number;editable:boolean;min?:number;max?:number;prefix?:string}){
  const [editing,setEditing]=useState(false);const cancel=useRef(false),editVersion=useRef(context.version);const mutation=useSheetMutation(context);
  function begin(){if(mutation.pending)return;cancel.current=false;editVersion.current=context.version;mutation.clearError();setEditing(true);}
  function focus(input:HTMLInputElement|null){input?.focus();input?.select();}
  function activate(event:KeyboardEvent<HTMLButtonElement>){if(event.key==='Enter'||event.key===' '){event.preventDefault();begin();}}
  async function commit(event:FocusEvent<HTMLInputElement>){if(cancel.current||mutation.pending)return;const raw=event.currentTarget.value;const next=field==='name'?raw.trim():raw.trim()===''?NaN:Number(raw);if(String(next)===String(value)){setEditing(false);return;}if(await mutation.save(field,{value:next},editVersion.current))setEditing(false);}
  function key(event:KeyboardEvent<HTMLInputElement>){if(event.key==='Escape'){event.preventDefault();cancel.current=true;setEditing(false);}else if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}
  if(!editable)return <span>{prefix}{value}</span>;
  return <span className={styles.inlineWrap} data-inline="true">{editing?<input ref={focus} className={styles.inlineInput} aria-label={label} type={field==='name'?'text':'number'} min={min} max={max} maxLength={field==='name'?200:undefined} step={1} defaultValue={value} onBlur={commit} onKeyDown={key} disabled={mutation.pending} aria-invalid={!!mutation.error} />:<button type="button" className={styles.inlineValue} onDoubleClick={begin} onKeyDown={activate} title={`Double-click to edit ${label}; keyboard: Enter`} aria-label={`${label}: ${prefix}${value}. Double-click or press Enter to edit.`}>{prefix}{value}</button>}{mutation.pending&&<small role="status">Saving…</small>}{mutation.error&&<small className={styles.error} role="alert">{mutation.error}{!editing&&<button type="button" onClick={begin}>Retry edit</button>}</small>}</span>;
}
