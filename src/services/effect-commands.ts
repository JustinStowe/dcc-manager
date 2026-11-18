import {getCampaignRole} from '@/domain';
import {STAT_KEYS,type StatKey} from '@/domain/tutorial';
import {bounded,loadoutTotals} from '@/domain/loadout';
import {derivedBaseline} from '@/domain/sheet';
import {DEFENSE_TYPES} from '@/domain/typed-defenses';
import {advanceEffectRound,projectedModifiers,restoreTrackedEffects,type TrackedEffect} from '@/domain/tracked-effects';
import {requireUuid,type CampaignWorkspace} from './campaign-workspace';
export interface EffectWrite {readonly crawlerId:string;readonly version:string;readonly operation:'add'|'edit'|'toggle'|'remove'|'tick';readonly payload:Record<string,unknown>}
export interface EffectPort{act(input:EffectWrite):Promise<void>}
function text(f:FormData,k:string,required=false){const r=f.get(k);if(r===null&&!required)return '';if(typeof r!=='string'||(required&&!r.trim()))throw new RangeError(`Enter ${k}.`);return r.trim();}
function definition(f:FormData,id:string):TrackedEffect{const duration=text(f,'rounds');return restoreTrackedEffects([{id,name:text(f,'name',true),kind:text(f,'kind',true),source:text(f,'source'),notes:text(f,'notes'),active:f.get('active')==='yes',remainingRounds:duration===''?null:Number(duration),modifiers:Object.fromEntries(STAT_KEYS.map(k=>[k,Number(text(f,k,true))])),defenses:Object.fromEntries(DEFENSE_TYPES.map(type=>[type,{resistant:f.get(`${type}-resistant`)==='yes',vulnerable:f.get(`${type}-vulnerable`)==='yes',immune:f.get(`${type}-immune`)==='yes'}]))}])[0];}
export async function executeEffectCommand(w:CampaignWorkspace,f:FormData,port:EffectPort):Promise<string>{
 const crawlerId=requireUuid(text(f,'crawlerId',true)),version=requireUuid(text(f,'version',true)),c=w.campaign,entry=c?.crawlers.find(e=>e.crawler.id===crawlerId);
 if(!c||!entry||getCampaignRole(c,w.userId)!=='gm')throw new Error('Only the campaign GM can manage effects.');
 if(w.versions[crawlerId]!==version)throw new Error('Crawler changed. Refresh before saving effects.');
 const meta=w.sheets?.[crawlerId],loadout=w.loadouts?.[crawlerId],items=w.inventories?.[crawlerId];if(!meta?.trackedEffects||!loadout||!items)throw new Error('Effects unavailable. Apply the effects migration and refresh.');
 const operation=text(f,'operation',true)as EffectWrite['operation'];let after=meta.trackedEffects,payload:Record<string,unknown>;
 if(operation==='add'){const value=definition(f,'new-effect');after=restoreTrackedEffects([...after,value]);payload={definition:value};}
 else if(operation==='tick'){if(f.get('confirmed')!=='yes')throw new RangeError('Confirm advancing this crawler one round.');after=advanceEffectRound(after);payload={};}
 else{const id=text(f,'effectId',true),effect=after.find(e=>e.id===id);if(!effect)throw new RangeError('Effect unavailable.');
  if(operation==='edit'){const value={...definition(f,id),...(effect.templateId?{templateId:effect.templateId,templateVersion:effect.templateVersion}:{})};after=restoreTrackedEffects(after.map(e=>e.id===id?value:e));payload={id,definition:value};}
  else if(operation==='toggle'){const active=text(f,'active',true);if(!['true','false'].includes(active))throw new RangeError('Choose active or inactive.');after=restoreTrackedEffects(after.map(e=>e.id===id?{...e,active:active==='true'}:e));payload={id,active:active==='true'};}
  else if(operation==='remove'){if(f.get('confirmed')!=='yes')throw new RangeError('Confirm effect removal.');after=after.filter(e=>e.id!==id);payload={id};}
  else throw new RangeError('Unknown effect action.');
 }
 const bases=Object.fromEntries(STAT_KEYS.map(k=>[k,bounded(loadout.baseline[k].base,1,10000)]))as Record<StatKey,number>;loadoutTotals(derivedBaseline(bases,projectedModifiers(after)),items,loadout.defenseBase);
 await port.act({crawlerId,version,operation,payload});return operation==='tick'?'One round advanced for this crawler; expired effects deactivated.':'Effect saved.';
}
