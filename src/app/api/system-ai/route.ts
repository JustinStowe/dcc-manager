import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { loadCampaignWorkspace } from '@/adapters/supabase-campaign-repository';
import { createGroqClient, systemAiModel } from '@/adapters/groq-client';
import { createAiUsagePort } from '@/adapters/supabase-ai-usage';
import { executeSystemAi } from '@/services/system-ai-commands';
import { aiRequestSchema } from '@/lib/ai/schemas/floor-three';
import { SystemAiError } from '@/lib/ai/systemAi';
import { isSameOriginRequest } from '@/lib/http/request-origin';
export const runtime='nodejs';
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 try{
  if(!isSameOriginRequest(request))return Response.json({error:'The System AI request came from a different address. Refresh the game and try again.',code:'origin'},{status:403,headers});
  if(Number(request.headers.get('content-length')??0)>8000)return Response.json({error:'Request too large.'},{status:413,headers});
  const text=await request.text();if(text.length>8000)return Response.json({error:'Request too large.'},{status:413,headers});
  const parsed=aiRequestSchema.safeParse(JSON.parse(text));if(!parsed.success)return Response.json({error:'Check the System AI request.',code:'invalid-request'},{status:400,headers});
  const client=createClient(await cookies()),{data,error}=await client.auth.getUser();if(error||!data.user)return Response.json({error:'Sign in to use System AI.'},{status:401,headers});
  const workspace=await loadCampaignWorkspace(data.user.id,parsed.data.campaignId);
  const result=await executeSystemAi(workspace,parsed.data,createGroqClient(),await createAiUsagePort(),systemAiModel());return Response.json(result,{headers});
 }catch(error){
  if(error instanceof SystemAiError)return Response.json({error:error.message,code:error.code,retryAfter:error.retryAfter},{status:error.status,headers:{...headers,...(error.retryAfter?{'Retry-After':String(error.retryAfter)}:{})}});
  if(error instanceof SyntaxError)return Response.json({error:'Check the System AI request.'},{status:400,headers});
  return Response.json({error:'System AI could not load this crawler. Refresh the game and try again.',code:'request-failed'},{status:403,headers});
 }
}
