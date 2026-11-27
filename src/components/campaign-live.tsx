'use client';
import {useEffect,useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/utils/supabase/client';
import {createLiveConnection,type LiveClient} from '@/services/live-connection';
import {createLiveRefreshQueue} from '@/services/live-refresh-queue';
import {createLiveEditGuard} from '@/controllers/live-edit-guard';
import styles from '@/styles/sheet-controls.module.css';
export function CampaignLive({userId}:{userId:string}){
 const router=useRouter(),[pending,startTransition]=useTransition(),[status,setStatus]=useState('connecting'),[waiting,setWaiting]=useState(false);const refreshing=useRef(false);
 useEffect(()=>{refreshing.current=pending;},[pending]);
 useEffect(()=>{
  const client=createClient(),guard=createLiveEditGuard(document);let connected=false,lastRefresh=Date.now(),lastAttempt=0,writes=0;
  const queue=createLiveRefreshQueue({blocked:()=>document.visibilityState!=='visible'||refreshing.current||writes>0||guard.blocked(),refresh:()=>{lastRefresh=Date.now();startTransition(()=>router.refresh());},waiting:setWaiting,schedule:run=>window.setTimeout(run,250),cancel:timer=>window.clearTimeout(timer as number)});
  function request(){queue.request();}
  function writeStart(){writes++;}function writeEnd(){writes=Math.max(0,writes-1);queue.flush();}
  const connection=createLiveConnection(client as unknown as LiveClient,userId,()=>{document.dispatchEvent(new CustomEvent('dcc:live-signal',{detail:'changed'}));request();},state=>{connected=state==='SUBSCRIBED';setStatus(connected?'live':'reconnecting');if(connected){document.dispatchEvent(new CustomEvent('dcc:live-signal',{detail:'sync'}));queue.request();}});
  function connect(){lastAttempt=Date.now();void connection.connect();}
  const timer=window.setInterval(()=>{queue.flush();if(Date.now()-lastRefresh>=(connected?60000:15000))queue.request();if(Date.now()-lastAttempt>=30000)connect();},1000);
  window.addEventListener('focus',request);window.addEventListener('online',request);document.addEventListener('visibilitychange',request);document.addEventListener('focusout',request);document.addEventListener('close',request,true);document.addEventListener('dcc:form-saved',request);document.addEventListener('dcc:save-start',writeStart);document.addEventListener('dcc:save-end',writeEnd);
  connect();
  return()=>{connection.dispose();queue.dispose();guard.dispose();window.clearInterval(timer);window.removeEventListener('focus',request);window.removeEventListener('online',request);document.removeEventListener('visibilitychange',request);document.removeEventListener('focusout',request);document.removeEventListener('close',request,true);document.removeEventListener('dcc:form-saved',request);document.removeEventListener('dcc:save-start',writeStart);document.removeEventListener('dcc:save-end',writeEnd);};
 },[userId,router]);
 return <p className={styles.hint} role="status">{waiting?'Updates waiting — finish or close your current edit.':pending?'Updating…':status==='live'?'Live updates connected':status==='connecting'?'Connecting live updates…':'Live updates reconnecting; automatic checks continue.'}</p>;
}
