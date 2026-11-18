'use client';
import {useRef,useState,type FormEvent} from 'react';
import {skillAction} from '@/app/campaign/skill-actions';
import {useDialogAction} from '@/controllers/use-dialog-action';
import type {SheetContext} from '@/controllers/use-sheet-mutation';
import type {LearnedAbility} from '@/domain/abilities';
import {SheetModal} from './sheet-modal';
import {AbilityDefinitionFields} from './ability-definition-fields';
import styles from '@/styles/sheet-controls.module.css';
import layout from '@/styles/effect-dialog.module.css';
export function AbilityDefinitionEditor({context,ability}:{context:SheetContext;ability:LearnedAbility}){
 const [open,setOpen]=useState(false),[epoch,setEpoch]=useState(0),version=useRef(context.version),mutation=useDialogAction(skillAction,{...context});
 function show(){version.current=context.version;mutation.clearError();setEpoch(epoch+1);setOpen(true);}function close(){if(!mutation.pending)setOpen(false);}
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();const element=event.currentTarget,form=new FormData(element);form.set('operation','edit');form.set('skillId',ability.id);if(await mutation.save(form,version.current,element))setOpen(false);}
 if(ability.automation==='tutorial-heal')return null;
 return <><button type="button" className={styles.statToggle} onClick={show}>GM definition / rank correction</button><SheetModal open={open} title={`GM definition / rank correction: ${ability.name}`} pending={mutation.pending} onClose={close}><form className={layout.editor} key={epoch} onSubmit={save} aria-label={`Correct ${ability.name}`}><fieldset disabled={mutation.pending} className={styles.fields}><legend>{ability.name}</legend><AbilityDefinitionFields ability={ability}/><div className={styles.actions}><button type="submit">Save reviewed ability</button><button type="button" onClick={close}>Cancel</button></div></fieldset></form>{mutation.pending&&<p role="status">Saving…</p>}{mutation.error&&<p role="alert" className={styles.error}>{mutation.error}</p>}</SheetModal></>;
}
