import { createHash } from 'node:crypto';
import { pairIssues, progressionOptions, PROGRESSION_VERSION, previewProgression, type ProgressionOption } from '@/domain/progression';
import { parseCustomBuild, validateCustomBuild } from '@/domain/custom-build';
import { generateSystemAi, SystemAiError, type SystemAiClient } from '@/lib/ai/systemAi';
import { aiRequestSchema, customBuildSchema, suggestionsSchema, selectionSuggestionsSchema } from '@/lib/ai/schemas/floor-three';
import { candidateSummary, classSuggestionPrompt, customBuildPrompt, selectionSuggestionPrompt, type CrawlerAiContext } from '@/lib/ai/prompts/floor-three';
import { progressionContext } from './progression-commands';
import type { CampaignWorkspace } from './campaign-workspace';
export interface AiUsagePort {
 reserve(input:{crawlerId:string;version:string;purpose:string;fingerprint:string;model:string}):Promise<{id:string;cached:unknown|null}>;
 finish(id:string,status:'succeeded'|'failed',response:unknown,tokens:number):Promise<void>;
}
export async function executeSystemAi(workspace:CampaignWorkspace,input:unknown,client:SystemAiClient,usage:AiUsagePort,model:string){
 const request=aiRequestSchema.parse(input),c=progressionContext(workspace,request.crawlerId,request.version);
 if(workspace.campaign?.id!==request.campaignId)throw new SystemAiError('access-denied','Crawler access denied.',403);
 if(c.sheet.floor<3||!c.sheet.advancement?.reconciled)throw new SystemAiError('unavailable','Reach Floor 3 and complete advancement review before asking for selection suggestions.',422);
 const options=progressionOptions(c.state),races=options.filter(o=>o.kind==='race'&&(request.purpose==='selection-suggestions'||!request.raceId||o.id===request.raceId));
 function previewable(race:ProgressionOption,profession:ProgressionOption){
  if(request.purpose!=='selection-suggestions')return true;
  const selected=[race,profession];if(race.id==='primal'){const original=options.find(o=>o.id===c.state.evidence.facts.originalRace&&o.kind==='race');if(!original)return false;selected.unshift(original);}
  const choices=Object.fromEntries(selected.flatMap(o=>o.choices.map(g=>[`${o.id}.${g.id}`,g.ids.slice(0,g.count)]))),split=Object.fromEntries(selected.filter(o=>o.splitStats).map(o=>[o.id,{[o.splitStats!.keys[0]]:o.splitStats!.total}]));
  try{previewProgression({...c.state,offers:[{id:'ai-preview',raceId:race.id,classId:profession.id,waivers:[],reason:'AI eligibility preview'}]},c.sheet.thirdFloor!,c.sheet.floor,'ai-preview',choices,split,{stats:c.stats,skills:c.skills},c.loadout.defenseBase,c.sheet.baseDefenses??{});return true;}catch{return false;}
 }
 const legalPairs=races.flatMap(race=>options.filter(o=>o.kind==='class').filter(profession=>!pairIssues(c.state,race,profession,{stats:c.stats,skills:c.skills}).length&&previewable(race,profession)).map(profession=>candidateSummary(race,profession)))
  .sort((a,b)=>Object.keys(b.skills).filter(id=>c.skills.some(s=>s.id===id)).length-Object.keys(a.skills).filter(id=>c.skills.some(s=>s.id===id)).length);
 const candidates=request.purpose==='selection-suggestions'?legalPairs:legalPairs.slice(0,35);
 const matchingRaces=races.filter(r=>legalPairs.some(p=>p.raceId===r.id)),matchingClasses=options.filter(o=>o.kind==='class'&&legalPairs.some(p=>p.classId===o.id));
 const profile=workspace.tutorials?.[request.crawlerId]?.profile;
 const context:CrawlerAiContext={stats:c.stats,skills:c.skills,evidence:c.state.evidence,history:JSON.stringify({backgrounds:profile?.backgrounds}),story:{trauma:profile?.notes.trauma??'',regret:profile?.notes.regret??'',looseEnds:profile?.notes.looseEnds??''},candidates};
 if(request.purpose!=='custom-build'&&!candidates.length)throw new SystemAiError('no-candidates','No verified eligible pairs are available. Ask the GM to review unknown facts or the Earth incentive decision.',422);
 const fingerprint=createHash('sha256').update(JSON.stringify({request,model,rules:PROGRESSION_VERSION,prompt:'system-ai-v3',story:context.story})).digest('hex');
 const lease=await usage.reserve({crawlerId:request.crawlerId,version:request.version,purpose:request.purpose,fingerprint,model});
 try{
  const run=request.purpose==='class-suggestions'?{
   id:'class-suggestions',schema:suggestionsSchema,messages:classSuggestionPrompt(context),validate(value:ReturnType<typeof suggestionsSchema.parse>){const keys=value.recommendations.map(r=>`${r.raceId}|${r.classId}`);return keys.some((key,i)=>keys.indexOf(key)!==i)||value.recommendations.some(r=>!candidates.some(p=>p.raceId===r.raceId&&p.classId===r.classId))?[{code:'candidate',message:'Choose distinct supplied eligible pairs only.'}]:[];}
  }:null;
  let value:unknown,tokens=0;
  if(run){if(lease.cached){value=run.schema.parse(lease.cached);if(run.validate(value as ReturnType<typeof suggestionsSchema.parse>).length)throw new Error('Invalid cached candidates.');}else{const result=await generateSystemAi(client,run,model);value=result.value;tokens=result.tokens;}}
  else if(request.purpose==='selection-suggestions'){
   const validate=(value:ReturnType<typeof selectionSuggestionsSchema.parse>)=>value.races.length!==Math.min(3,matchingRaces.length)||value.classes.length!==Math.min(3,matchingClasses.length)||new Set(value.races.map(r=>r.raceId)).size!==value.races.length||new Set(value.classes.map(r=>r.classId)).size!==value.classes.length||value.races.some(r=>!matchingRaces.some(o=>o.id===r.raceId))||value.classes.some(r=>!legalPairs.some(p=>p.raceId===r.raceId&&p.classId===r.classId))?[{code:'candidate',message:'Return the top three distinct supplied Races and Classes (or all when fewer exist), using only compatible pairs.'}]:[];
   if(lease.cached){value=selectionSuggestionsSchema.parse(lease.cached);if(validate(value as ReturnType<typeof selectionSuggestionsSchema.parse>).length)throw new Error('Invalid cached matches.');}
   else{const result=await generateSystemAi(client,{id:'selection-suggestions',schema:selectionSuggestionsSchema,messages:selectionSuggestionPrompt(context,matchingRaces,matchingClasses,legalPairs),validate},model);value=result.value;tokens=result.tokens;}
  }
  else{
   const validate=(value:ReturnType<typeof customBuildSchema.parse>)=>{const result=validateCustomBuild(parseCustomBuild(value),{stats:c.stats,skills:c.skills});return[...result.issues,...(value.kind!==request.kind||value.earth!==request.earth?[{code:'kind',message:'Use the requested kind and Earth/Alien origin.'}]:[])];};
   if(lease.cached){value=customBuildSchema.parse(lease.cached);if(validate(value as ReturnType<typeof customBuildSchema.parse>).length)throw new Error('Invalid cached build.');}
   else{const result=await generateSystemAi(client,{id:'custom-build',schema:customBuildSchema,messages:customBuildPrompt(context,request.kind,request.earth,request.theme),validate},model);value=result.value;tokens=result.tokens;}
  }
  if(!lease.cached)await usage.finish(lease.id,'succeeded',value,tokens);
  return{purpose:request.purpose,result:value,model,cached:!!lease.cached};
 }catch(error){if(!lease.cached)await usage.finish(lease.id,'failed',null,error instanceof SystemAiError?error.tokens:0).catch(()=>{});throw error;}
}
