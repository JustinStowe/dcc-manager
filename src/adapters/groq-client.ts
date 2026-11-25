import 'server-only';
import Groq from 'groq-sdk';
import { SystemAiError, type SystemAiClient } from '@/lib/ai/systemAi';
export function systemAiModel(){return process.env.GROQ_MODEL?.trim()||'openai/gpt-oss-20b';}
export function createGroqClient():SystemAiClient{
 if(!process.env.GROQ_API_KEY?.trim())throw new SystemAiError('not-configured','System AI is not configured. Manual Race/Class selection is available.');
 const sdk=new Groq({apiKey:process.env.GROQ_API_KEY,maxRetries:0,timeout:25000});
 return{async complete(request){
  try{
   const result=await sdk.chat.completions.create({model:request.model,messages:[...request.messages],response_format:{type:'json_schema',json_schema:{name:request.name,strict:true,schema:request.schema}},max_completion_tokens:request.maxTokens,temperature:0.6,...(request.model.startsWith('openai/gpt-oss-')?{reasoning_effort:'low' as const}:{})});
   if(!result.choices[0]?.message.content)throw new SystemAiError('empty-output','The System returned no draft. Try again.',502);
   return{content:result.choices[0].message.content,tokens:result.usage?.total_tokens??0};
  }catch(error){
   if(error instanceof SystemAiError)throw error;
   if(error instanceof Groq.RateLimitError){const raw=Number(error.headers?.get('retry-after'));throw new SystemAiError('rate-limit','The System needs a moment. Your draft is still on this screen.',429,Number.isFinite(raw)&&raw>0?Math.min(3600,Math.ceil(raw)):30);}
   if(error instanceof Groq.APIError&&[400,403,404].includes(error.status??0))throw new SystemAiError('model-unavailable','The configured System AI model is unavailable or does not support strict output. Ask the GM to check its configuration.');
   if(error instanceof Groq.APIConnectionTimeoutError)throw new SystemAiError('timeout','The System took too long. Try again shortly.',504);
   throw new SystemAiError('provider-unavailable','The System is temporarily unavailable. Manual selection remains available.');
  }
 }};
}
