import { expect,it,vi } from 'vitest';
vi.mock('server-only',()=>({}));
import { createGroqClient,systemAiModel } from '@/adapters/groq-client';
import { generateSystemAi } from './systemAi';
import { customBuildSchema,suggestionsSchema } from './schemas/floor-three';
import { customBuildPrompt,classSuggestionPrompt,type CrawlerAiContext } from './prompts/floor-three';
import { validateCustomBuild } from '@/domain/custom-build';
import { INITIAL_PROGRESSION } from '@/domain/progression';
// Explicit opt-in only: never requires a provider account or network in CI.
it.runIf(process.env.DCC_RUN_LIVE_AI==='1').each(['race','class']as const)('validates a real strict-schema Groq custom %s using synthetic data only',async kind=>{
 process.loadEnvFile('.env.local');
 const stats={strength:20,intelligence:20,constitution:20,dexterity:20,charisma:20},skills=[]as const;
 const budget=kind==='race'?25:30;
 const result=await generateSystemAi(createGroqClient(),{id:'custom-build',schema:customBuildSchema,messages:customBuildPrompt({stats,skills,evidence:INITIAL_PROGRESSION.evidence,history:'Synthetic connection test. No real crawler data.',candidates:[]},kind,true,`A stone golem guardian. Use only stat traits. Spend exactly ${budget} BP across the five Stats; no penalties or other traits.`),validate:build=>validateCustomBuild(build,{stats,skills}).issues},systemAiModel());
 expect(validateCustomBuild(result.value,{stats,skills}).legal).toBe(true);expect(result.value.kind).toBe(kind);expect(result.tokens).toBeGreaterThan(0);
},60000);

it.runIf(process.env.DCC_RUN_LIVE_AI==='1')('validates real Groq recommendations with the original text-length caps',async()=>{
 process.loadEnvFile('.env.local');
 const candidates:CrawlerAiContext['candidates']=[{raceId:'human',classId:'fighter',name:'Human / Boring Ol’ Fighter',skills:{dodge:3}},{raceId:'human',classId:'blizzardmancer',name:'Human / Blizzardmancer',skills:{'ice-blast':4}}];
 const result=await generateSystemAi(createGroqClient(),{id:'class-suggestions',schema:suggestionsSchema,messages:classSuggestionPrompt({stats:{strength:20,intelligence:20,constitution:20,dexterity:20,charisma:20},skills:[],evidence:INITIAL_PROGRESSION.evidence,history:'Synthetic tutorial history. No real crawler data.',candidates}),validate:value=>{const ids=value.recommendations.map(r=>`${r.raceId}|${r.classId}`);return new Set(ids).size!==ids.length||value.recommendations.some(r=>!candidates.some(c=>c.raceId===r.raceId&&c.classId===r.classId))?[{code:'candidate',message:'Use the supplied candidates only.'}]:[];}},systemAiModel());
 expect(suggestionsSchema.safeParse(result.value).success).toBe(true);
 for(const row of result.value.recommendations){expect(row.commentary.length).toBeLessThanOrEqual(500);expect(row.reason.length).toBeLessThanOrEqual(400);}
},60000);
