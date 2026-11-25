import 'server-only';
import { z } from 'zod';
import type { BuildIssue } from '@/domain/custom-build';
export class SystemAiError extends Error {constructor(readonly code:string,message:string,readonly status=503,readonly retryAfter=0,public tokens=0){super(message);this.name='SystemAiError';}}
/** A generated response failed validation; the model/configuration may be valid. */
export class SystemAiOutputError extends SystemAiError {
 constructor(readonly feedback:string,tokens=0){super('invalid-output','The System returned an invalid or overly long draft. Try a shorter theme or generate again.',502,0,tokens);}
}
export interface AiMessage {readonly role:'system'|'user'|'assistant';readonly content:string}
export interface AiCompletionRequest {readonly model:string;readonly messages:readonly AiMessage[];readonly schema:Record<string,unknown>;readonly name:string;readonly maxTokens:number}
export interface AiCompletion {readonly content:string;readonly tokens:number}
export interface SystemAiClient {complete(request:AiCompletionRequest):Promise<AiCompletion>}
export interface AiPurpose<T>{readonly id:string;readonly schema:z.ZodType<T>;readonly messages:readonly AiMessage[];validate(value:T):readonly BuildIssue[]}
export function jsonSchemaFor<T>(schema:z.ZodType<T>):Record<string,unknown>{const result=z.toJSONSchema(schema);delete result.$schema;return result;}
export async function generateSystemAi<T>(client:SystemAiClient,purpose:AiPurpose<T>,model:string){
 const messages=[...purpose.messages];let tokens=0;
 // One shared repair budget for provider, JSON/schema and game-rule failures.
 function repair(feedback:string){messages.push({role:'user',content:JSON.stringify({repair:feedback,instruction:'Return a new response matching the supplied JSON schema exactly. Keep text concise and within every length limit. Use only supplied legal choices; do not waive rules.'})});}
 for(let attempt=0;attempt<2;attempt++){
  let completion:AiCompletion;
  try{completion=await client.complete({model,messages,schema:jsonSchemaFor(purpose.schema),name:purpose.id.replaceAll('-','_'),maxTokens:1600});}
  catch(error){
   if(error instanceof SystemAiOutputError){tokens+=error.tokens;if(attempt===0){repair(error.feedback);continue;}error.tokens=tokens;throw error;}
   if(error instanceof SystemAiError){error.tokens+=tokens;throw error;}
   throw new SystemAiError('provider-unavailable','The System is taking an unscheduled break. Try again shortly.',503,0,tokens);
  }
  tokens+=completion.tokens;
  let json:unknown;
  try{json=JSON.parse(completion.content);}catch{
   const feedback='The previous response was not valid JSON. Return only the requested JSON object.';
   if(attempt===0){repair(feedback);continue;}throw new SystemAiOutputError(feedback,tokens);
  }
  const parsed=purpose.schema.safeParse(json);
  if(!parsed.success){
   // Send validation constraints, never raw output or a full provider error body.
   const issues=parsed.error.issues.slice(0,8).map(issue=>({code:issue.code,path:issue.path.map(p=>typeof p==='number'?p:/^[a-zA-Z0-9_-]{1,80}$/.test(String(p))?String(p):'?'),...('maximum'in issue&&typeof issue.maximum==='number'?{maximum:issue.maximum}:{}),...('minimum'in issue&&typeof issue.minimum==='number'?{minimum:issue.minimum}:{})}));
   const feedback=JSON.stringify({schemaIssues:issues});
   if(attempt===0){repair(feedback);continue;}throw new SystemAiOutputError(feedback,tokens);
  }
  const value=parsed.data;
  let issues:readonly BuildIssue[];
  try{issues=purpose.validate(value);}catch(error){if(!(error instanceof RangeError))throw new SystemAiError('validation-unavailable','The System could not validate this draft. Manual selection remains available.',503,0,tokens);issues=[{code:'rules',message:error.message}];}
  if(!issues.length)return{value,tokens};
  if(attempt===0){messages.push({role:'assistant',content:JSON.stringify(value)},{role:'user',content:JSON.stringify({repair:issues.map(i=>({code:i.code,message:i.message})),instruction:'Repair the draft using only the supplied legal choices. Do not waive rules.'})});}
 }
 throw new SystemAiError('illegal-build','The System could not produce a legal draft. Adjust the theme or use the manual editor.',422,0,tokens);
}
