'use client';
import {useState,type FormEvent,type ChangeEvent} from 'react';
import type {EffectTemplate} from '@/domain/effect-templates';
import {templateAction} from '@/app/campaign/template-actions';
import {useDialogAction} from '@/controllers/use-dialog-action';
import {SheetModal} from './sheet-modal';
import {EffectFields} from './effect-fields';
import styles from '@/styles/effect-dialog.module.css';
import controls from '@/styles/sheet-controls.module.css';
export function EffectTemplateManager({campaignId,templates}:{campaignId:string;templates:readonly EffectTemplate[]}){
 const [open,setOpen]=useState(false),[choice,setChoice]=useState<EffectTemplate|null>(null),[epoch,setEpoch]=useState(0);const mutation=useDialogAction(templateAction,{campaignId});
 function choose(e:ChangeEvent<HTMLSelectElement>){setChoice(templates.find(t=>t.id===e.currentTarget.value)??null);setEpoch(epoch+1);mutation.clearError();}
 function close(){if(!mutation.pending)setOpen(false);}
 function show(){setChoice(null);setEpoch(epoch+1);mutation.clearError();setOpen(true);}
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();const el=event.currentTarget,f=new FormData(el);f.set('operation',(event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')==='remove'?'remove':choice?'edit':'add');if(choice){f.set('templateId',choice.id);f.set('templateVersion',choice.version);}if(await mutation.save(f,undefined,el))setOpen(false);}
 return <><button type="button" onClick={show}>Manage effect templates</button><SheetModal open={open} title="GM effect templates" pending={mutation.pending} onClose={close}>
 <p>Reusable self-effects for this game. Editing a template changes future uses; existing effects keep their saved definition. Link a template from a Spell or custom consumable.</p>
 <label className={styles.picker}>Template<select disabled={mutation.pending} value={choice?.id??''} onChange={choose}><option value="">Add a new template</option>{templates.map(t=><option key={t.id} value={t.id}>{t.definition.name}</option>)}</select></label>
 <form className={styles.editor} key={epoch} onSubmit={save} aria-label="Save effect template"><fieldset disabled={mutation.pending} className={controls.fields}><legend>{choice?'Edit template':'New template'}</legend>
 <EffectFields template effect={choice?{...choice.definition,id:choice.id,active:true}:undefined}/>
 <label>Repeat use<select name="policy" defaultValue={choice?.repeatPolicy??'refresh'}><option value="refresh">Refresh: reset one instance, preserve its ID</option><option value="replace">Replace: remove previous instances and create one</option><option value="add">Add: create another stacking instance</option></select></label>
 <p>Refresh and replace consolidate all instances from this template on the user. Add stacks stat changes; typed-defense flags combine without multiplying.</p>
 <button type="submit" value="save">Save template</button>{choice&&<><label><input type="checkbox" name="confirmed" value="yes"/>Confirm deleting this template and its links (existing effects remain).</label><button type="submit" value="remove" formNoValidate>Delete template</button></>}
 <button type="button" onClick={close}>Cancel</button></fieldset></form>{mutation.pending&&<p role="status">Saving…</p>}{mutation.error&&<p role="alert">{mutation.error}</p>}
 </SheetModal></>;
}
