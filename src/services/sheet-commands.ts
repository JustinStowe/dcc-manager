import { getCampaignRole } from '@/domain';
import { bounded, loadoutTotals } from '@/domain/loadout';
import { derivedBaseline, restoreEffects, typedDamage, type DamagePart } from '@/domain/sheet';
import { STAT_KEYS, type StatKey } from '@/domain/tutorial';
import { requireUuid, type CampaignWorkspace } from './campaign-workspace';
export interface SheetWrite { readonly crawlerId:string; readonly version:string; readonly operation:string; readonly payload:Record<string,unknown> }
export interface SheetPort { act(input:SheetWrite):Promise<void> }
function text(form:FormData,key:string) { const v=form.get(key);if(typeof v!=='string'||!v.trim())throw new RangeError(`Enter ${key}.`);return v.trim(); }
export async function executeSheetCommand(workspace:CampaignWorkspace,form:FormData,port:SheetPort):Promise<string> {
  const crawlerId=requireUuid(text(form,'crawlerId')),version=requireUuid(text(form,'version')),campaign=workspace.campaign;
  const entry=campaign?.crawlers.find((row)=>row.crawler.id===crawlerId),role=campaign?getCampaignRole(campaign,workspace.userId):null;
  if(!entry||!role||(role!=='gm'&&entry.ownerUserId!==workspace.userId))throw new Error('You do not have access to this crawler.');
  if(workspace.versions[crawlerId]!==version)throw new Error('Crawler changed. Refresh before saving.');
  const official=workspace.tutorials?.[crawlerId],loadout=workspace.loadouts?.[crawlerId],items=workspace.inventories?.[crawlerId],metadata=workspace.sheets?.[crawlerId];
  if(!official||!loadout||!items||!metadata)throw new Error('Sheet data unavailable. Apply the sheet migration and refresh.');
  const operation=text(form,'operation'),raw:unknown=JSON.parse(text(form,'payload'));
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Invalid sheet change.');
  const source=raw as Record<string,unknown>; let payload:Record<string,unknown>;
  if(['base-stats','number','level','floor','favor-award','effect-add','effect-toggle','effect-remove','defense'].includes(operation)&&role!=='gm')throw new Error('Only the GM can make this change.');
  if(operation==='damage') {const parts=source.parts as DamagePart[];typedDamage(entry.crawler.currentSegments,official.profile.stats.constitution.enhanced,loadoutTotals(loadout.baseline,items,loadout.defenseBase).dr,parts);payload={parts:parts.map((part)=>({type:part.type,amount:part.amount}))};}
  else if(operation==='healing')payload={amount:bounded(source.amount,1,10)};
  else if(operation==='mana')payload={value:bounded(source.value,0,official.profile.stats.intelligence.enhanced)};
  else if(operation==='favor-use'){if(official.profile.favor<1)throw new RangeError('No AI Favor available.');payload={};}
  else if(operation==='favor-award'){const amount=bounded(source.amount,1,2147483647);bounded(official.profile.favor+amount,0,2147483647);payload={amount};}
  else if(operation==='name'){if(role!=='player')throw new Error('Only the owning player can rename their crawler.');if(typeof source.value!=='string'||!source.value.trim()||Array.from(source.value.trim()).length>200)throw new RangeError('Enter a name of 1–200 characters.');payload={value:source.value.trim()};}
  else if(['number','level','floor','defense'].includes(operation))payload={value:bounded(source.value,operation==='defense'?0:1,operation==='floor'?18:operation==='level'?1000:operation==='defense'?10000:2147483647)};
  else if(operation==='base-stats'){const bases=source.bases as Record<StatKey,number>;if(!bases||typeof bases!=='object')throw new RangeError('Enter all five stats.');const baseline=derivedBaseline(bases,metadata.effects);loadoutTotals(baseline,items,loadout.defenseBase);payload={bases:Object.fromEntries(STAT_KEYS.map((key)=>[key,baseline[key].base]))};}
  else if(operation==='effect-add'){const effect=restoreEffects([{id:'pending',name:source.name,active:source.active,modifiers:source.modifiers}])[0];const effects=restoreEffects([...metadata.effects,effect]);loadoutTotals(derivedBaseline(Object.fromEntries(STAT_KEYS.map((key)=>[key,loadout.baseline[key].base])) as Record<StatKey,number>,effects),items,loadout.defenseBase);payload={name:effect.name,active:effect.active,modifiers:effect.modifiers};}
  else if(operation==='effect-toggle'||operation==='effect-remove'){if(typeof source.id!=='string'||!metadata.effects.some((effect)=>effect.id===source.id))throw new RangeError('Modifier unavailable.');if(operation==='effect-toggle'&&typeof source.active!=='boolean')throw new RangeError('Choose active or inactive.');payload=operation==='effect-toggle'?{id:source.id,active:source.active}:{id:source.id};}
  else throw new RangeError('Unknown sheet action.');
  await port.act({crawlerId,version,operation,payload});return 'Sheet saved.';
}
