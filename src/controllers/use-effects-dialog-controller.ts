'use client';
import {useRef,useState,type ChangeEvent,type FormEvent} from 'react';
import type {TrackedEffect} from '@/domain/tracked-effects';
import type {SheetContext} from './use-sheet-mutation';
import {useEffectDialogMutation} from './use-effect-dialog-mutation';

export function useEffectsDialogController(context:SheetContext,effects:readonly TrackedEffect[]){
 const [open,setOpen]=useState(false),[selectedId,setSelectedId]=useState('new'),[generation,setGeneration]=useState(0),[confirmRemove,setConfirmRemove]=useState(false),[confirmRound,setConfirmRound]=useState(false);
 const version=useRef(context.version),mutation=useEffectDialogMutation(context);
 const selected=effects.find(effect=>effect.id===selectedId),missing=selectedId!=='new'&&!selected;
 function show(){version.current=context.version;mutation.clearError();setSelectedId(effects.find(e=>e.active)?.id??effects[0]?.id??'new');setConfirmRemove(false);setConfirmRound(false);setGeneration(generation+1);setOpen(true);}
 function close(){if(!mutation.pending)setOpen(false);}
 function choose(event:ChangeEvent<HTMLSelectElement>){if(mutation.pending)return;mutation.clearError();setSelectedId(event.currentTarget.value);setConfirmRemove(false);setConfirmRound(false);setGeneration(generation+1);}
 function removeConfirmation(event:ChangeEvent<HTMLInputElement>){setConfirmRemove(event.currentTarget.checked);}
 function roundConfirmation(event:ChangeEvent<HTMLInputElement>){setConfirmRound(event.currentTarget.checked);}
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();if(missing)return;const element=event.currentTarget,form=new FormData(element);form.set('operation',selected?'edit':'add');if(selected)form.set('effectId',selected.id);if(await mutation.save(form,version.current,element))setOpen(false);}
 async function command(operation:'toggle'|'remove'|'tick'){
  if(mutation.pending||(operation!=='tick'&&!selected)||(operation==='remove'&&!confirmRemove)||(operation==='tick'&&!confirmRound))return;
  if(operation==='toggle'&&!selected!.active&&selected!.remainingRounds===0)return;
  const form=new FormData();form.set('operation',operation);if(selected)form.set('effectId',selected.id);
  if(operation==='toggle')form.set('active',String(!selected!.active));else form.set('confirmed','yes');
  if(await mutation.save(form,version.current))setOpen(false);
 }
 async function toggle(){await command('toggle');}
 async function remove(){await command('remove');}
 async function tick(){await command('tick');}
 return {model:{open,selectedId,selected,missing,generation,confirmRemove,confirmRound,canTick:effects.some(e=>e.active&&e.remainingRounds!==null),pending:mutation.pending,error:mutation.error},actions:{show,close,choose,save,toggle,remove,tick,removeConfirmation,roundConfirmation}};
}
