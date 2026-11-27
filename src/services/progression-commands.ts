import { pendingSelectionMenu } from '@/domain/selection-menus';
import { getCampaignRole } from '@/domain';
import { advancementReason, allocatePoints, spendableAdvancement } from '@/domain/advancement';
import { parseCustomBuild, validateCustomBuild } from '@/domain/custom-build';
import { pairIssues, previewProgression, resolveProgressionPair, restoreEvidence, restoreProgression } from '@/domain/progression';
import { object, shortText } from '@/domain/third-floor';
import { STAT_KEYS, type Scores } from '@/domain/tutorial';
import { derivedBaseline } from '@/domain/sheet';
import { loadoutTotals } from '@/domain/loadout';
import { requireUuid, type CampaignWorkspace } from './campaign-workspace';
export interface ProgressionPort { act(input:{crawlerId:string;version:string;operation:string;payload:Record<string,unknown>}):Promise<void> }
export function progressionContext(workspace:CampaignWorkspace,crawlerId:string,version:string){
 const campaign=workspace.campaign,role=campaign?getCampaignRole(campaign,workspace.userId):null,entry=campaign?.crawlers.find(c=>c.crawler.id===crawlerId);
 if(!entry||!role||(role!=='gm'&&entry.ownerUserId!==workspace.userId))throw new Error('Crawler access denied.');
 if(workspace.versions[crawlerId]!==version)throw new Error('Crawler changed. Close this dialog, refresh and reopen it.');
 const sheet=workspace.sheets?.[crawlerId],loadout=workspace.loadouts?.[crawlerId],skills=workspace.skills?.[crawlerId],items=workspace.inventories?.[crawlerId];
 if(!sheet?.thirdFloor||!sheet.advancement||!loadout||!skills||!items)throw new Error('Official crawler data unavailable.');
 const stats=Object.fromEntries(STAT_KEYS.map(k=>[k,loadout.baseline[k].base]))as Scores;
 return{sheet,loadout,skills,items,stats,isGm:role==='gm',state:restoreProgression(sheet.progression)};
}
function strings(value:unknown,max=100){if(!Array.isArray(value)||value.length>max)throw new RangeError('Enter a bounded list of explicit review choices.');return value.map(v=>shortText(v,120));}
export async function executeProgressionCommand(workspace:CampaignWorkspace,form:FormData,port:ProgressionPort){
 const crawlerId=requireUuid(shortText(form.get('crawlerId'))),version=requireUuid(shortText(form.get('version'))),operation=shortText(form.get('operation'));
 const c=progressionContext(workspace,crawlerId,version),input=object(JSON.parse(shortText(form.get('payload'),100000))),reason=advancementReason(input.reason);
 if(input.confirmed!==true)throw new RangeError('Confirm the benefit and rules review.');
 if(!['draft','approve','evidence','offer','select','catalog-select','reward','prepare-reconciliation'].includes(operation))throw new RangeError('Unknown progression action.');
 if(!['draft','select','catalog-select'].includes(operation)&&!c.isGm)throw new Error('Only the GM may review evidence, approve builds, issue offers or override rules.');
 let payload:Record<string,unknown>={reason,confirmed:true};
 if(operation==='draft')payload={...payload,build:parseCustomBuild(input.build)};
 if(operation==='approve'){
  const id=shortText(input.id,80),definition=c.state.definitions.find(d=>d.id===id);if(!definition)throw new RangeError('Choose a saved draft.');
  const waivers=strings(input.waivers),result=validateCustomBuild(definition.build,{stats:c.stats,skills:c.skills});
  if(waivers.some(code=>!result.issues.some(i=>i.code===code)))throw new RangeError('Waive only listed rule violations.');
  if(result.issues.some(i=>!waivers.includes(i.code)))throw new RangeError(result.issues.map(i=>i.message).join(' '));
  payload={...payload,id,waivers};
 }
 if(operation==='evidence')payload={...payload,evidence:restoreEvidence(input.evidence)};
 if(operation==='reward'){if(!['issue-once','already-received','declined'].includes(input.decision as string))throw new RangeError('Record one reviewed Earth incentive decision.');payload={...payload,decision:input.decision};}
 if(operation==='offer'){
  if(!Array.isArray(input.offers)||input.offers.length>3)throw new RangeError('Offer at most three pairs.');
  const offers=input.offers.map(v=>{const o=object(v),raceId=shortText(o.raceId),classId=shortText(o.classId),waivers=strings(o.waivers),pair=resolveProgressionPair(c.state,raceId,classId),issues=pairIssues(c.state,pair.race,pair.profession,{stats:c.stats,skills:c.skills});
   if(waivers.includes('earth-reward'))throw new RangeError('Record the single Earth reward decision before offering this pair.');
   if(issues.some(i=>!waivers.includes(i.code))||waivers.some(code=>code!=='selection-rank-cap'&&!issues.some(i=>i.code===code)))throw new RangeError('Verify the missing facts or explicitly waive each listed constraint.');
   return{raceId,classId,waivers,reason};});payload={...payload,offers};
 }
 if(operation==='select'||operation==='catalog-select'){
  if(c.state.partialReview&&!c.sheet.thirdFloor!.reviewed&&!c.isGm)throw new Error('The GM must complete this partial benefit reconciliation.');
  if(!c.sheet.advancement!.reconciled)throw new RangeError('Reconcile level advancement first.');
  const catalog=operation==='catalog-select',menu=pendingSelectionMenu(c.sheet.selectionMenus,c.sheet.floor);
  if(catalog&&(!menu?.catalog||c.sheet.floor!==3||c.state.offers.length||c.sheet.thirdFloor!.offers.length))throw new RangeError('The GM must open the reviewed catalog for this crawler.');
  const raceId=catalog?shortText(input.raceId):'',classId=catalog?shortText(input.classId):'',offerId=catalog?'catalog':shortText(input.offerId);
  const selectionState=catalog?{...c.state,offers:[{id:offerId,raceId,classId,waivers:[],reason:'GM authorized the reviewed catalog'}]}:c.state;
  const choices=object(input.choices) as Record<string,string[]>,split=object(input.split) as Record<string,Partial<Scores>>,skip=strings(input.skip),allocation=input.allocation;
  if(skip.length&&!c.isGm)throw new Error('Only the GM can reconcile individual benefits already applied.');
  let stats=c.stats;
  if(allocation!==undefined)stats=allocatePoints(c.sheet.level,spendableAdvancement(c.sheet.level,c.sheet.advancement!,c.sheet.floor,c.sheet.saferoom===true),c.sheet.floor,allocation,c.stats).bases;
  const result=previewProgression(selectionState,c.sheet.thirdFloor!,c.sheet.floor,offerId,choices,split,{stats,skills:c.skills},c.loadout.defenseBase,c.sheet.baseDefenses??{},skip);
  loadoutTotals(derivedBaseline(result.stats,c.sheet.effects),c.items,result.dr);
  payload={...payload,...(catalog?{raceId,classId}:{offerId}),choices,split,skip,...(allocation!==undefined?{allocation}: {})};
 }
 await port.act({crawlerId,version,operation,payload});return'Race/Class progress saved.';
}
