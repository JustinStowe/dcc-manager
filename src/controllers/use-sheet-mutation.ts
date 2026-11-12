'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sheetAction } from '@/app/campaign/sheet-actions';
export interface SheetContext { readonly campaignId:string; readonly crawlerId:string; readonly version:string }
export function useSheetMutation(context:SheetContext){
  const [pending,setPending]=useState(false),[error,setError]=useState<string|null>(null);const locked=useRef(false);const router=useRouter();
  async function save(operation:string,payload:Record<string,unknown>,expectedVersion?:string):Promise<boolean>{
    if(locked.current)return false;locked.current=true;setPending(true);setError(null);
    try{const form=new FormData();for(const [key,value]of Object.entries(context))form.set(key,value);if(expectedVersion)form.set('version',expectedVersion);form.set('operation',operation);form.set('payload',JSON.stringify(payload));const result=await sheetAction({error:null,notice:null},form);if(result.error){setError(result.error);return false;}router.refresh();return true;}
    catch{setError('Could not save. Refresh the sheet before trying again.');return false;}
    finally{locked.current=false;setPending(false);}
  }
  function clearError(){setError(null);}
  return {save,pending,error,clearError};
}
