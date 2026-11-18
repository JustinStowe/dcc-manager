'use client';
import {startTransition,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {announceFormSaved} from './live-edit-guard';
import type {CampaignFormState} from '@/services/campaign-workspace';
export function useDialogAction(action:(state:CampaignFormState,form:FormData)=>Promise<CampaignFormState>,context:Readonly<Record<string,string>>){
 const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null);const locked=useRef(false),router=useRouter();
 function clearError(){setError(null);}
 async function save(form:FormData,expectedVersion?:string,element:HTMLFormElement|null=null):Promise<boolean>{
  if(locked.current)return false;locked.current=true;setPending(true);setError(null);for(const[k,v]of Object.entries(context))form.set(k,v);if(expectedVersion)form.set('version',expectedVersion);document.dispatchEvent(new Event('dcc:save-start'));
  return new Promise(resolve=>{startTransition(async()=>{try{const result=await action({error:null,notice:null},form);if(result.error){setError(result.error);resolve(false);}else{announceFormSaved(element);router.refresh();resolve(true);}}catch{setError('Could not save. Close the dialog, let updates finish, then try again.');resolve(false);}finally{locked.current=false;setPending(false);document.dispatchEvent(new Event('dcc:save-end'));}});});
 }
 return{pending,error,save,clearError};
}
