'use client';
import {useRef,useState,type FormEvent} from 'react';
import type {EffectTemplate} from '@/domain/effect-templates';
import type {SheetContext} from '@/controllers/use-sheet-mutation';
import {templateAction} from '@/app/campaign/template-actions';
import {useDialogAction} from '@/controllers/use-dialog-action';
import {SheetModal} from './sheet-modal';
import styles from '@/styles/sheet-controls.module.css';
export function EffectTemplateLink({context,kind,target,templates,linkedId}:{context:SheetContext;kind:'spell'|'item';target:string;templates:readonly EffectTemplate[];linkedId?:string}){
 const [open,setOpen]=useState(false),[epoch,setEpoch]=useState(0),version=useRef(context.version),mutation=useDialogAction(templateAction,{...context});
 function show(){version.current=context.version;setEpoch(epoch+1);mutation.clearError();setOpen(true);}
 function close(){if(!mutation.pending)setOpen(false);}
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const el=e.currentTarget,f=new FormData(el);f.set('operation','link');f.set('kind',kind);f.set('target',target);if(await mutation.save(f,version.current,el))setOpen(false);}
 return <><button type="button" onClick={show}>Link self effect</button><SheetModal open={open} title="GM: link self effect" pending={mutation.pending} onClose={close}><form key={epoch} onSubmit={save} aria-label="Link self effect"><fieldset className={styles.fields} disabled={mutation.pending}><legend>Effect applied to the user</legend><label>Template<select name="templateId" defaultValue={linkedId??''}><option value="">No automated self effect</option>{templates.map(t=><option key={t.id} value={t.id}>{t.definition.name} · {t.repeatPolicy}</option>)}</select></label><p>Applies once when this prepared Spell is cast or one consumable is used. Mana or quantity and the effect save together. Confirm eligible targets, successful Checks and timing before using. This does not apply effects to other crawlers.</p><button type="submit">Save link</button><button type="button" onClick={close}>Cancel</button></fieldset></form>{mutation.error&&<p role="alert">{mutation.error}</p>}{mutation.pending&&<p role="status">Saving…</p>}</SheetModal></>;
}
