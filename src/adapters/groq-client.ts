import 'server-only';
import Groq from 'groq-sdk';
import { SystemAiError, SystemAiOutputError, type SystemAiClient } from '@/lib/ai/systemAi';
function record(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function providerFailure(error:InstanceType<typeof Groq.APIError>){
 const body=record(error.error),detail=body.error&&typeof body.error==='object'?record(body.error):body;
 const code=typeof detail.code==='string'?detail.code:'';
 const message=typeof detail.message==='string'?detail.message.toLowerCase():'';
 const knownCodes=['json_validate_failed','model_not_found','model_decommissioned','model_permission_blocked','unsupported_response_format','invalid_json_schema','context_length_exceeded','invalid_api_key'];
 // Provider messages and failed_generation can contain private crawler text.
 // Log only a known identifier and numeric status; never log the raw error.
 console.warn('[System AI provider]',{status:error.status??null,code:knownCodes.includes(code)?code:'other'});
 if(code==='json_validate_failed')return new SystemAiOutputError('The provider rejected the previous generated JSON. Obey every schema constraint, including maxLength and list limits. Regenerate concise text rather than a long explanation.');
 if(error.status===401||code==='invalid_api_key')return new SystemAiError('provider-auth','System AI credentials were rejected. Ask the GM to check the server configuration.');
 if(error.status===403||error.status===404||['model_not_found','model_decommissioned','model_permission_blocked','unsupported_response_format'].includes(code)||(error.status===400&&message.includes('not supported')&&/response_format|json_schema|strict/.test(message)))return new SystemAiError('model-unavailable','The configured System AI model is unavailable or does not support strict output. Ask the GM to check its configuration.');
 if(code==='context_length_exceeded'||error.status===413)return new SystemAiError('context-too-large','The System AI request is too large. Shorten the theme or background notes and try again.',422);
 if(error.status===400)return new SystemAiError('provider-request-rejected','The System AI provider rejected the request format. Your crawler is unchanged; report this message if retrying does not help.',502);
 return new SystemAiError('provider-unavailable','The System is temporarily unavailable. Manual selection remains available.');
}
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
   if(error instanceof Groq.APIConnectionTimeoutError)throw new SystemAiError('timeout','The System took too long. Try again shortly.',504);
   if(error instanceof Groq.APIError)throw providerFailure(error);
   throw new SystemAiError('provider-unavailable','The System is temporarily unavailable. Manual selection remains available.');
  }
 }};
}
