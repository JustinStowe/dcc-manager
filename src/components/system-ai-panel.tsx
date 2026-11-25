'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { SheetContext } from '@/controllers/use-sheet-mutation';
import { parseCustomBuild, type CustomBuild } from '@/domain/custom-build';
import { suggestionsSchema, type ClassSuggestions } from '@/lib/ai/schemas/floor-three';
import styles from '@/styles/sheet-controls.module.css';
export function SystemAiPanel({context,raceId,onBuild,onSuggestions}:{context:SheetContext;raceId:string;onBuild(build:CustomBuild):void;onSuggestions(value:ClassSuggestions):void}){
 const[pending,setPending]=useState(false),[error,setError]=useState(''),[remaining,setRemaining]=useState(0),[build,setBuild]=useState<CustomBuild|null>(null),[notice,setNotice]=useState('');
 const abort=useRef<AbortController|null>(null);
 useEffect(()=>()=>{abort.current?.abort();},[]);
 useEffect(()=>{if(remaining<1)return;const timer=setTimeout(()=>setRemaining(n=>Math.max(0,n-1)),1000);return()=>clearTimeout(timer);},[remaining]);
 async function generate(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(abort.current||remaining)return;const fields=new FormData(event.currentTarget),purpose=String(fields.get('purpose'));
  const controller=new AbortController();abort.current=controller;setPending(true);setError('');setNotice('');const timeout=setTimeout(()=>controller.abort(),55000);
  try{
   const response=await fetch('/api/system-ai',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({...context,purpose,raceId,kind:fields.get('kind'),earth:fields.get('earth')==='yes',theme:fields.get('theme')})});
   const result=await response.json();if(!response.ok){setRemaining(Math.min(3600,Math.max(0,Number(result.retryAfter)||0)));throw new Error(typeof result.error==='string'?result.error:'The System is unavailable.');}
   if(purpose==='class-suggestions'){onSuggestions(suggestionsSchema.parse(result.result));setNotice('Recommendations ready. The GM controls the offered menu.');}
   else{setBuild(parseCustomBuild(result.result));setNotice('Legal custom draft ready for your review.');}
  }catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'The System is unavailable.');else setError('The request ended before a draft arrived. Your crawler is unchanged.');}
  finally{clearTimeout(timeout);abort.current=null;setPending(false);}
 }
 function useBuild(){if(build)onBuild(build);}
 return <details><summary>Ask the System AI</summary><p>Generate suggestions or a custom draft. The GM approves offers and custom definitions. Generation never applies benefits.</p>
  <form onSubmit={generate}><fieldset className={styles.fields} disabled={pending||remaining>0}>
   <label>Request<select name="purpose" defaultValue="class-suggestions"><option value="class-suggestions">Class recommendations for the selected Race</option><option value="custom-build">Custom Race or Class draft</option></select></label>
   <label>Custom type<select name="kind" defaultValue="class"><option value="class">Class · 30 BP</option><option value="race">Race · 25 BP</option></select></label>
   <label><input name="earth" type="checkbox" value="yes" defaultChecked /> Earth origin for custom draft</label>
   <label>Theme / preferences<textarea name="theme" maxLength={800} placeholder="A protective chef who solves problems with a frying pan…" /></label>
   <button type="submit">{pending?'The System is thinking…':remaining?`Retry in ${remaining}s`:'Generate'}</button>
  </fieldset></form>
  {pending&&<p role="status">Waiting for the System…</p>}{remaining>0&&<p role="status">Try again in {remaining} seconds. Your form remains available.</p>}
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {build&&<><p>{build.name}: {build.description}</p><button type="button" onClick={useBuild}>Load this build into the editor</button></>}
 </details>;
}
