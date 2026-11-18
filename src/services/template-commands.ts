import {getCampaignRole} from '@/domain';
import {STAT_KEYS} from '@/domain/tutorial';
import {DEFENSE_TYPES} from '@/domain/typed-defenses';
import {itemEffect} from '@/domain/inventory';
import {restoreTemplateDefinition,type TemplateDefinition,type RepeatPolicy} from '@/domain/effect-templates';
import {requireUuid,type CampaignWorkspace} from './campaign-workspace';
export interface TemplateWrite {campaignId:string;operation:'add'|'edit'|'remove'|'link';templateId?:string;templateVersion?:string;crawlerId?:string;crawlerVersion?:string;kind?:'spell'|'item';target?:string;definition?:TemplateDefinition;policy?:RepeatPolicy;confirmed?:boolean}
export interface TemplatePort {act(input:TemplateWrite):Promise<void>}
function text(f:FormData,k:string,required=false){const v=f.get(k);if(v===null&&!required)return '';if(typeof v!=='string'||(required&&!v.trim()))throw new RangeError(`Enter ${k}.`);return v.trim();}
export async function executeTemplateCommand(w:CampaignWorkspace,f:FormData,port:TemplatePort):Promise<string>{
 const c=w.campaign;if(!c||getCampaignRole(c,w.userId)!=='gm')throw new Error('Only the campaign GM manages templates and links.');
 if(!w.templates)throw new Error('Templates unavailable. Apply migration 013 and refresh.');
 const operation=text(f,'operation',true) as TemplateWrite['operation'];if(!['add','edit','remove','link'].includes(operation))throw new RangeError('Unknown template action.');
 const input:TemplateWrite={campaignId:c.id,operation};const id=text(f,'templateId');if(id){input.templateId=requireUuid(id);if(!w.templates.some(t=>t.id===input.templateId&&t.campaignId===c.id))throw new RangeError('Template unavailable in this game.');}
 if(operation==='link'){
  input.crawlerId=requireUuid(text(f,'crawlerId',true));input.crawlerVersion=requireUuid(text(f,'version',true));
  if(!c.crawlers.some(e=>e.crawler.id===input.crawlerId))throw new RangeError('Crawler unavailable.');
  if(w.versions[input.crawlerId]!==input.crawlerVersion)throw new Error('Crawler changed. Reopen the dialog.');
  const kind=text(f,'kind',true),target=text(f,'target',true);if(kind!=='spell'&&kind!=='item')throw new RangeError('Choose a supported target.');input.kind=kind;input.target=target;
  const valid=kind==='spell'?w.skills?.[input.crawlerId]?.some(a=>a.id===target&&a.kind==='spell'&&a.automation==='manual'):w.inventories?.[input.crawlerId]?.some(i=>i.id===target&&i.kind==='consumable'&&itemEffect(i)==='manual');
  if(!valid)throw new RangeError('Only manual Spells and custom consumables can be linked.');
 }else{
  if(operation!=='add'){
   const template=w.templates.find(t=>t.id===input.templateId);if(!template)throw new RangeError('Choose a template.');input.templateVersion=requireUuid(text(f,'templateVersion',true));if(template.version!==input.templateVersion)throw new Error('Template changed. Reopen the dialog.');
  }
  if(operation==='remove'){if(f.get('confirmed')!=='yes')throw new RangeError('Confirm removal of the template and its links.');input.confirmed=true;}
  else{
   if(operation==='add'&&w.templates.length>=100)throw new RangeError('Template limit reached (100 per game).');
   const policy=text(f,'policy',true);if(!['refresh','replace','add'].includes(policy))throw new RangeError('Choose a repeat-use policy.');input.policy=policy as RepeatPolicy;
   const duration=text(f,'rounds');input.definition=restoreTemplateDefinition({name:text(f,'name',true),kind:text(f,'kind',true),source:text(f,'source'),notes:text(f,'notes'),remainingRounds:duration===''?null:Number(duration),modifiers:Object.fromEntries(STAT_KEYS.map(k=>[k,Number(text(f,k,true))])),defenses:Object.fromEntries(DEFENSE_TYPES.map(type=>[type,{resistant:f.get(`${type}-resistant`)==='yes',vulnerable:f.get(`${type}-vulnerable`)==='yes',immune:f.get(`${type}-immune`)==='yes'}]))});
  }
 }
 await port.act(input);return operation==='link'?'Self-effect link saved.':operation==='remove'?'Template removed; existing effect instances preserved.':'Template saved; future uses apply this definition.';
}
