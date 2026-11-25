import { createHash } from 'node:crypto';
import { pairIssues, progressionOptions, PROGRESSION_VERSION } from '@/domain/progression';
import { parseCustomBuild, validateCustomBuild } from '@/domain/custom-build';
import { generateSystemAi, SystemAiError, type SystemAiClient } from '@/lib/ai/systemAi';
import { aiRequestSchema, customBuildSchema, suggestionsSchema } from '@/lib/ai/schemas/floor-three';
import { candidateSummary, classSuggestionPrompt, customBuildPrompt, type CrawlerAiContext } from '@/lib/ai/prompts/floor-three';
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
 const options=progressionOptions(c.state),races=options.filter(o=>o.kind==='race'&&(!request.raceId||o.id===request.raceId));
 const candidates=races.flatMap(race=>options.filter(o=>o.kind==='class').filter(profession=>!pairIssues(c.state,race,profession,{stats:c.stats,skills:c.skills}).length).map(profession=>candidateSummary(race,profession)))
  .sort((a,b)=>Object.keys(b.skills).filter(id=>c.skills.some(s=>s.id===id)).length-Object.keys(a.skills).filter(id=>c.skills.some(s=>s.id===id)).length).slice(0,35);
 const profile=workspace.tutorials?.[request.crawlerId]?.profile;
 const context:CrawlerAiContext={stats:c.stats,skills:c.skills,evidence:c.state.evidence,history:JSON.stringify({backgrounds:profile?.backgrounds,notes:profile?.notes}),candidates};
 if(request.purpose==='class-suggestions'&&!candidates.length)throw new SystemAiError('no-candidates','No verified eligible pairs are available. Ask the GM to review unknown facts or the Earth incentive decision.',422);
 const fingerprint=createHash('sha256').update(JSON.stringify({request,model,rules:PROGRESSION_VERSION,prompt:'system-ai-v1'})).digest('hex');
 const lease=await usage.reserve({crawlerId:request.crawlerId,version:request.version,purpose:request.purpose,fingerprint,model});
 try{
  const run=request.purpose==='class-suggestions'?{
   id:'class-suggestions',schema:suggestionsSchema,messages:classSuggestionPrompt(context),validate(value:ReturnType<typeof suggestionsSchema.parse>){const keys=value.recommendations.map(r=>`${r.raceId}|${r.classId}`);return keys.some((key,i)=>keys.indexOf(key)!==i)||value.recommendations.some(r=>!candidates.some(p=>p.raceId===r.raceId&&p.classId===r.classId))?[{code:'candidate',message:'Choose distinct supplied eligible pairs only.'}]:[];}
  }:null;
  let value:unknown,tokens=0;
  if(run){if(lease.cached){value=run.schema.parse(lease.cached);if(run.validate(value as ReturnType<typeof suggestionsSchema.parse>).length)throw new Error('Invalid cached candidates.');}else{const result=await generateSystemAi(client,run,model);value=result.value;tokens=result.tokens;}}
  else{
   const validate=(value:ReturnType<typeof customBuildSchema.parse>)=>{const result=validateCustomBuild(parseCustomBuild(value),{stats:c.stats,skills:c.skills});return[...result.issues,...(value.kind!==request.kind||value.earth!==request.earth?[{code:'kind',message:'Use the requested kind and Earth/Alien origin.'}]:[])];};
   if(lease.cached){value=customBuildSchema.parse(lease.cached);if(validate(value as ReturnType<typeof customBuildSchema.parse>).length)throw new Error('Invalid cached build.');}
   else{const result=await generateSystemAi(client,{id:'custom-build',schema:customBuildSchema,messages:customBuildPrompt(context,request.kind,request.earth,request.theme),validate},model);value=result.value;tokens=result.tokens;}
  }
  if(!lease.cached)await usage.finish(lease.id,'succeeded',value,tokens);
  return{purpose:request.purpose,result:value,model,cached:!!lease.cached};
 }catch(error){if(!lease.cached)await usage.finish(lease.id,'failed',null,error instanceof SystemAiError?error.tokens:0).catch(()=>{});throw error;}
}
