import { expect,it,vi } from 'vitest';
vi.mock('server-only',()=>({}));
import { createGroqClient,systemAiModel } from '@/adapters/groq-client';
import { generateSystemAi } from './systemAi';
import { customBuildSchema } from './schemas/floor-three';
import { customBuildPrompt } from './prompts/floor-three';
import { validateCustomBuild } from '@/domain/custom-build';
import { INITIAL_PROGRESSION } from '@/domain/progression';
// Explicit opt-in only: never requires a provider account or network in CI.
it.runIf(process.env.DCC_RUN_LIVE_AI==='1')('validates a real strict-schema Groq custom draft using synthetic data only',async()=>{
 process.loadEnvFile('.env.local');
 const stats={strength:20,intelligence:20,constitution:20,dexterity:20,charisma:20},skills=[]as const;
 const result=await generateSystemAi(createGroqClient(),{id:'custom-build',schema:customBuildSchema,messages:customBuildPrompt({stats,skills,evidence:INITIAL_PROGRESSION.evidence,history:'Synthetic connection test. No real crawler data.',candidates:[]},'race',true,'A stone golem. Use only stat traits. Spend exactly 25 BP across the five Stats; no penalties or other traits.'),validate:build=>validateCustomBuild(build,{stats,skills}).issues},systemAiModel());
 expect(validateCustomBuild(result.value,{stats,skills}).legal).toBe(true);expect(result.value.kind).toBe('race');expect(result.tokens).toBeGreaterThan(0);
},60000);
