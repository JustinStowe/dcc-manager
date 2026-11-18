import { bounded } from './loadout';
import { restoreEffects,type StatEffect } from './sheet';
import { restoreDefenses,DEFENSE_TYPES,type TypedDefenses } from './typed-defenses';
export interface TrackedEffect extends StatEffect {readonly kind:'buff'|'debuff'|'condition';readonly source:string;readonly notes:string;readonly remainingRounds:number|null;readonly defenses:TypedDefenses;readonly templateId?:string;readonly templateVersion?:string}
export function restoreTrackedEffects(value:unknown):readonly TrackedEffect[]{
 if(!Array.isArray(value)||value.length>100)throw new RangeError('Expected up to 100 effects.');
 const result=value.map((raw:unknown)=>{if(!raw||typeof raw!=='object')throw new RangeError('Invalid effect.');const r=raw as Record<string,unknown>;const base=restoreEffects([r])[0];if(r.templateId!==undefined||r.templateVersion!==undefined){for(const k of ['templateId','templateVersion'])if(typeof r[k]!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r[k] as string))throw new RangeError('Invalid template provenance.');}if(!['buff','debuff','condition'].includes(r.kind as string)||typeof r.source!=='string'||Array.from(r.source).length>200||typeof r.notes!=='string'||Array.from(r.notes).length>2000)throw new RangeError('Check effect kind, source and notes.');const remainingRounds=r.remainingRounds===null?null:bounded(r.remainingRounds,0,10000);if(base.active&&remainingRounds===0)throw new RangeError('Expired effects must be inactive; set a new duration before activating.');return {...base,kind:r.kind as TrackedEffect['kind'],source:r.source.trim(),notes:r.notes.trim(),remainingRounds,defenses:restoreDefenses(r.defenses),...(r.templateId?{templateId:r.templateId as string,templateVersion:r.templateVersion as string}:{})};});
 restoreEffects(result);return result;
}
export function projectedModifiers(effects:readonly TrackedEffect[]):readonly StatEffect[]{return restoreTrackedEffects(effects).map(({id,name,active,modifiers})=>({id,name,active,modifiers}));}
export function effectiveDefenses(base:TypedDefenses,effects:readonly TrackedEffect[]):TypedDefenses{
 const initial=restoreDefenses(base),active=restoreTrackedEffects(effects).filter((e)=>e.active);const result:Record<string,{resistant:boolean;vulnerable:boolean;immune:boolean}>={};
 for(const type of DEFENSE_TYPES){const sources=[initial[type],...active.map((effect)=>effect.defenses[type])];result[type]={resistant:sources.some((s)=>s?.resistant),vulnerable:sources.some((s)=>s?.vulnerable),immune:sources.some((s)=>s?.immune)};}
 return restoreDefenses(result);
}
export function advanceEffectRound(effects:readonly TrackedEffect[]):readonly TrackedEffect[]{return restoreTrackedEffects(restoreTrackedEffects(effects).map((effect)=>!effect.active||effect.remainingRounds===null?effect:{...effect,remainingRounds:effect.remainingRounds-1,active:effect.remainingRounds>1}));}
