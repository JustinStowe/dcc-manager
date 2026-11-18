import {restoreTrackedEffects,type TrackedEffect} from './tracked-effects';
export type RepeatPolicy='refresh'|'replace'|'add';
export type TemplateDefinition=Omit<TrackedEffect,'id'|'active'|'templateId'|'templateVersion'>;
export interface EffectTemplate {readonly id:string;readonly campaignId:string;readonly version:string;readonly repeatPolicy:RepeatPolicy;readonly definition:TemplateDefinition}
export type EffectLinks=Readonly<Record<string,string>>;
function uuid(value:unknown):string{if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new RangeError('Invalid template ID.');return value.toLowerCase();}
export function restoreTemplateDefinition(value:unknown):TemplateDefinition{if(!value||typeof value!=='object')throw new RangeError('Invalid template definition.');const effect=restoreTrackedEffects([{...value,id:'template',active:true}])[0];if(effect.remainingRounds===0)throw new RangeError('Template duration must be positive or unlimited.');return {name:effect.name,kind:effect.kind,source:effect.source,notes:effect.notes,remainingRounds:effect.remainingRounds,modifiers:effect.modifiers,defenses:effect.defenses};}
export function restoreTemplate(value:unknown):EffectTemplate{if(!value||typeof value!=='object')throw new RangeError('Invalid template.');const r=value as Record<string,unknown>;if(!['refresh','replace','add'].includes(r.repeatPolicy as string))throw new RangeError('Choose a repeat-use policy.');return{id:uuid(r.id),campaignId:uuid(r.campaignId),version:uuid(r.version),repeatPolicy:r.repeatPolicy as RepeatPolicy,definition:restoreTemplateDefinition(r.definition)};}
export function restoreEffectLinks(value:unknown):EffectLinks{if(!value||typeof value!=='object'||Array.isArray(value))throw new RangeError('Invalid effect links.');const result:Record<string,string>={};for(const[key,id]of Object.entries(value)){if(!/^(spell|item):[a-z0-9][a-z0-9-]{0,79}$/.test(key))throw new RangeError('Invalid link target.');result[key]=uuid(id);}return result;}
export function applyEffectTemplate(current:readonly TrackedEffect[],template:EffectTemplate,instanceId:string,sourceName:string):readonly TrackedEffect[]{
 const checked=restoreTemplate(template),rows=restoreTrackedEffects(current),existing=rows.find(e=>e.templateId===checked.id),keep=checked.repeatPolicy==='add'?rows:rows.filter(e=>e.templateId!==checked.id);
 const id=checked.repeatPolicy==='refresh'&&existing?existing.id:instanceId;
 return restoreTrackedEffects([...keep,{...checked.definition,id,active:true,source:checked.definition.source||Array.from(sourceName.trim()).slice(0,200).join(''),templateId:checked.id,templateVersion:checked.version}]);
}
