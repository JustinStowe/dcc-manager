'use client';
import {startTransition,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {effectAction} from '@/app/campaign/effect-actions';
import {announceFormSaved} from '@/controllers/live-edit-guard';
import type {SheetContext} from '@/controllers/use-sheet-mutation';

export function useEffectDialogMutation(context:SheetContext){
 const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null);const locked=useRef(false),router=useRouter();
 function clearError(){setError(null);}
 async function save(form:FormData,version:string,element:HTMLFormElement|null=null):Promise<boolean>{
  if(locked.current)return false;
  locked.current=true;setPending(true);setError(null);
  for(const [key,value]of Object.entries(context))form.set(key,value);
  form.set('version',version);
  document.dispatchEvent(new Event('dcc:save-start'));
  return new Promise<boolean>(resolve=>{startTransition(async()=>{
   try{const state=await effectAction({error:null,notice:null},form);if(state.error){setError(state.error);resolve(false);}else{announceFormSaved(element);router.refresh();resolve(true);}}
   catch{setError('Could not save the effect. Close the dialog, let updates finish, and try again.');resolve(false);}
   finally{locked.current=false;setPending(false);document.dispatchEvent(new Event('dcc:save-end'));}
  });});
 }
 return {pending,error,save,clearError};
}
