import data from './progression-catalog.json';
import { BUILD_GROUPS, BUILD_TRAITS, parseCustomBuild, validateCustomBuild, type CustomBuild, type BuildContext } from './custom-build';
import { restoreAbilities, restoreAbility, type AbilityDefinition } from './abilities';
import { STAT_KEYS, type Scores } from './tutorial';
import { whole, type AdvancementState } from './advancement';
import { mergeSelectionDefenses, object, shortText, type ThirdFloorState } from './third-floor';
import type { TypedDefenses } from './typed-defenses';

export type Requirement =
  | {kind:'fact';key:string;value:string|boolean}
  | {kind:'skill';id:string;rank:number}
  | {kind:'anySkill';ids:readonly string[];rank:number}
  | {kind:'groupSkill';group:string;rank:number}
  | {kind:'physicalSkill';rank:number}
  | {kind:'popularity';minimum:number}
  | {kind:'race';ids:readonly string[]}
  | {kind:'identity';key:string}
  | {kind:'minimum';stat:typeof STAT_KEYS[number];minimum:number};
export interface ProgressionOption {
  readonly id:string;readonly name:string;readonly page:number;readonly kind:'race'|'class';readonly earth:boolean;readonly earthOnly:boolean;readonly size:number;
  readonly stats:Scores;readonly skills:Readonly<Record<string,number>>;readonly dr:number;readonly defenses:TypedDefenses;readonly notes:string;
  readonly requirements:readonly Requirement[];readonly choices:readonly {id:string;label:string;ids:readonly string[];bonus:number;count:number;cap20?:boolean}[];
  readonly rank20:readonly string[];readonly rank20Groups:readonly string[];readonly statCaps:Readonly<Partial<Scores>>;readonly skillPenalties:Readonly<Partial<Scores>>;
  readonly splitStats:{total:number;keys:readonly typeof STAT_KEYS[number][]}|null;
  readonly move?:number;readonly step?:number;
  readonly classTypes?:readonly string[];
}
export const PROGRESSION_VERSION=data.version;
export const PREMADE_OPTIONS=data.options as unknown as readonly ProgressionOption[];
export const PROGRESSION_ABILITIES=data.abilities as readonly (Omit<AbilityDefinition,'rank'> & {id:string})[];
export interface ProgressionEvidence { readonly facts:Readonly<Record<string,boolean|string|number>>;readonly popularity:number|null;readonly identityLimits:boolean }
export interface CustomDefinition {readonly id:string;readonly build:CustomBuild;readonly approved:boolean;readonly ruling:string;readonly waivers:readonly string[]}
export interface ProgressionOffer {readonly id:string;readonly raceId:string;readonly classId:string;readonly waivers:readonly string[];readonly reason:string}
export interface ProgressionSelection {readonly race:ProgressionOption;readonly profession:ProgressionOption;readonly inheritedRace?:ProgressionOption|null;readonly choices:Readonly<Record<string,readonly string[]>>;readonly applied:readonly string[];readonly skipped:readonly string[];readonly waivers:readonly string[];readonly rulesVersion:string;readonly actor:string;readonly reason:string}
export interface ProgressionState {
 readonly version:1;readonly evidence:ProgressionEvidence;readonly definitions:readonly CustomDefinition[];readonly offers:readonly ProgressionOffer[];
 readonly rewardDecision:null|'issue-once'|'already-received'|'declined';readonly selection:ProgressionSelection|null;
 readonly partialReview?:boolean;
}
export const INITIAL_PROGRESSION:ProgressionState={version:1,evidence:{facts:{},popularity:null,identityLimits:false},definitions:[],offers:[],rewardDecision:null,selection:null};
export function restoreEvidence(value:unknown):ProgressionEvidence {
 const row=object(value),facts=object(row.facts);
 if(Object.keys(facts).length>100||typeof row.identityLimits!=='boolean')throw new RangeError('Invalid verified evidence.');
 for(const [key,v]of Object.entries(facts))if(!/^[a-zA-Z0-9:-]{1,80}$/.test(key)||!['string','boolean','number'].includes(typeof v)||(typeof v==='string'&&v.length>120)||(typeof v==='number'&&(!Number.isSafeInteger(v)||v<1||v>8)))throw new RangeError('Check verified facts.');
 return{facts:{...facts,...(typeof facts.originalSpecies==='string'?{originalSpecies:facts.originalSpecies.trim().toLowerCase()}:{})}as ProgressionEvidence['facts'],identityLimits:row.identityLimits,popularity:row.popularity===null?null:whole(row.popularity,0,100000)};
}
export function restoreProgression(value:unknown):ProgressionState {
 if(value===undefined||value===null)return INITIAL_PROGRESSION;
 const row=object(value);
 if(row.version!==1||!Array.isArray(row.definitions)||row.definitions.length>30||!Array.isArray(row.offers)||row.offers.length>3||![null,'issue-once','already-received','declined'].includes(row.rewardDecision as null))throw new RangeError('Invalid progression state.');
 const definitions=row.definitions.map(v=>{const d=object(v);if(typeof d.approved!=='boolean'||!Array.isArray(d.waivers))throw new RangeError('Invalid custom review.');return{id:shortText(d.id,80),build:parseCustomBuild(d.build),approved:d.approved,ruling:typeof d.ruling==='string'?d.ruling:'',waivers:d.waivers.map(w=>shortText(w,120))};});
 const offers=row.offers.map(v=>{const o=object(v);if(!Array.isArray(o.waivers))throw new RangeError('Invalid offer review.');return{id:shortText(o.id,80),raceId:shortText(o.raceId,80),classId:shortText(o.classId,80),waivers:o.waivers.map(w=>shortText(w,120)),reason:shortText(o.reason,500)};});
 if(row.partialReview!==undefined&&typeof row.partialReview!=='boolean')throw new RangeError('Invalid partial benefit review.');
 return{version:1,evidence:restoreEvidence(row.evidence),definitions,offers,rewardDecision:row.rewardDecision as ProgressionState['rewardDecision'],selection:row.selection===null?null:row.selection as ProgressionSelection,...(row.partialReview!==undefined?{partialReview:row.partialReview as boolean}:{})};
}
export interface EligibilityIssue {readonly code:string;readonly status:'unknown'|'unmet';readonly message:string}
export function evaluateRequirements(option:ProgressionOption,context:BuildContext,evidence:ProgressionEvidence,raceId:string):readonly EligibilityIssue[]{
 const issues:EligibilityIssue[]=[];
 option.requirements.forEach((req,index)=>{
  let passed=false,unknown=false,message='';
  if(req.kind==='fact'){const actual=evidence.facts[req.key];unknown=actual===undefined;passed=req.value===true?actual!==undefined&&actual!==false&&actual!=='':actual===req.value;message=`GM verification required: ${req.key} must be ${String(req.value)}.`;}
  if(req.kind==='skill'){passed=context.skills.some(s=>s.id===req.id&&s.rank>=req.rank);message=`Requires ${req.id} Rank ${req.rank}+ before grants.`;}
  if(req.kind==='anySkill'){passed=context.skills.some(s=>req.ids.includes(s.id)&&s.rank>=req.rank);message=`Requires ${req.ids.join(' or ')} Rank ${req.rank}+.`;}
  if(req.kind==='groupSkill'){passed=context.skills.some(s=>BUILD_GROUPS[req.group]?.includes(s.id)&&s.rank>=req.rank);message=`Requires an existing ${req.group} Skill Rank ${req.rank}+.`;}
  if(req.kind==='physicalSkill'){passed=context.skills.some(s=>(s.stat==='strength'||s.stat==='dexterity')&&s.rank>=req.rank);message=`Requires an existing Strength/Dexterity Skill Rank ${req.rank}+.`;}
  if(req.kind==='popularity'){unknown=evidence.popularity===null;passed=evidence.popularity!==null&&evidence.popularity>=req.minimum;message=`Requires verified Popularity ${req.minimum}+.`;}
  if(req.kind==='race'){passed=req.ids.includes(raceId);message='Requires a compatible cat-based Race.';}
  if(req.kind==='identity'){const v=evidence.facts[req.key];unknown=evidence.identityLimits&&v===undefined;passed=!evidence.identityLimits||v===true;message=`Group identity policy requires verified ${req.key} identity.`;}
  if(req.kind==='minimum'){passed=context.stats[req.stat]>=req.minimum;message=`Requires Unenhanced ${req.stat} ${req.minimum}+.`;}
  if(!passed)issues.push({code:`${option.id}:${index}`,status:unknown?'unknown':'unmet',message});
 });return issues;
}
export function customOption(definition:CustomDefinition):ProgressionOption {
 const build=definition.build,stats=Object.fromEntries(STAT_KEYS.map(k=>[k,0])) as Scores,skills:Record<string,number>={},defenses:Record<string,{resistant:boolean;vulnerable:boolean;immune:boolean}>={},rank20:string[]=[],statCaps:Partial<Scores>={},skillPenalties:Partial<Scores>={};let dr=0,move=20,step=10,size=4;const rank20Groups:string[]=[];
 for(const line of build.lines){const t=BUILD_TRAITS.find(t=>t.id===line.traitId)!;const key=line.target as typeof STAT_KEYS[number];
  if(t.effect==='stat')stats[key]+=line.quantity;
  if(t.effect==='statPenalty')stats[key]-=line.quantity;
  if(t.effect==='skill')skills[line.target]=(skills[line.target]??0)+line.quantity;
  if(t.effect.startsWith('skillGroup'))for(const id of BUILD_GROUPS[line.target])skills[id]=(skills[id]??0)+line.quantity;
  if(t.effect==='skillPenalty')skills[line.target]=(skills[line.target]??0)-line.quantity;
  if(t.effect==='groupPenalty')skillPenalties[key]=(skillPenalties[key]??0)-line.quantity;
  if(t.effect==='dr')dr+=line.quantity;
  if(t.effect==='move')move+=line.quantity*5;if(t.effect==='step')step+=line.quantity*5;if(t.effect==='size')size=2;
  if(t.effect==='statCap')statCaps[key]=10;
  if(t.effect==='rank20')rank20.push(line.target);
  if(t.effect==='rank20All')rank20Groups.push('all');
  if(t.effect==='rank20Group'||t.effect==='rank20Six')rank20Groups.push(line.target);
  if(['resistant','vulnerable','poisonImmune'].includes(t.effect)){const target=t.effect==='poisonImmune'?'Poison':line.target;defenses[target]??={resistant:false,vulnerable:false,immune:false};defenses[target][t.effect==='poisonImmune'?'immune':t.effect as 'resistant'|'vulnerable']=true;}
 }
 return{id:definition.id,name:build.name,page:158,kind:build.kind,earth:build.earth,earthOnly:build.kind==='class'&&build.earth,size,stats,skills,dr,defenses,choices:[],requirements:[],rank20,rank20Groups,statCaps,skillPenalties,splitStats:null,move,step,notes:[build.description,...build.lines.map(l=>`${l.quantity} × ${BUILD_TRAITS.find(t=>t.id===l.traitId)!.name}${l.target?`: ${l.target}`:''}`),...(build.bespoke??[]).map(b=>`GM-priced ${b.points} BP: ${b.name}: ${b.description}`),`GM ruling: ${definition.ruling}`].join('\n')};
}
export function progressionOptions(state:ProgressionState):readonly ProgressionOption[]{return[...PREMADE_OPTIONS,...state.definitions.filter(d=>d.approved).map(customOption)];}
export function resolveProgressionPair(state:ProgressionState,raceId:string,classId:string){const options=progressionOptions(state),race=options.find(o=>o.id===raceId&&o.kind==='race'),profession=options.find(o=>o.id===classId&&o.kind==='class');if(!race||!profession)throw new RangeError('Choose reviewed Race and Class definitions.');return{race,profession};}
export function pairIssues(state:ProgressionState,race:ProgressionOption,profession:ProgressionOption,context:BuildContext):readonly EligibilityIssue[]{
 const issues=[...evaluateRequirements(race,context,state.evidence,race.id),...evaluateRequirements(profession,context,state.evidence,race.id)];
 if(profession.earthOnly&&!race.earth)issues.push({code:'earth',status:'unmet',message:'An Earth Class requires an Earth Race.'});
 if((race.id.startsWith('custom-')&&race.earth||profession.earthOnly)&&state.rewardDecision===null)issues.push({code:'earth-reward',status:'unknown',message:'GM must record one Earth incentive decision; selection never auto-issues boxes or Potion ranks.'});
 for(const option of [race,profession]){const d=state.definitions.find(d=>d.id===option.id);if(d){const result=validateCustomBuild(d.build,context);for(const i of result.issues)if(!d.waivers.includes(i.code))issues.push({code:`${d.id}:${i.code}`,status:'unmet',message:i.message});}}
 return issues;
}
export function planMinimumAllocation(options:readonly ProgressionOption[],stats:Scores,advancement:AdvancementState){
 const deltas=Object.fromEntries(STAT_KEYS.map(k=>[k,0]))as Scores;
 for(const o of options)for(const r of o.requirements)if(r.kind==='minimum')deltas[r.stat]=Math.max(deltas[r.stat],r.minimum-stats[r.stat],0);
 const total=Object.values(deltas).reduce((a,b)=>a+b,0);
 return{deltas,total,available:advancement.authorized,possible:advancement.reconciled&&total<=advancement.authorized};
}
export function previewProgression(state:ProgressionState,thirdFloor:ThirdFloorState,floor:number,offerId:string,choices:Readonly<Record<string,readonly string[]>>,split:Readonly<Record<string,Partial<Scores>>>,context:BuildContext,defenseBase:number,baseDefenses:TypedDefenses,skip:readonly string[]=[]) {
 if(floor<3||(!thirdFloor.reviewed&&!state.partialReview)||thirdFloor.selected||state.selection)throw new RangeError('Selection requires Floor 3+, completed benefit review and no prior selection.');
 const offer=state.offers.find(o=>o.id===offerId);if(!offer)throw new RangeError('Choose a current GM offer.');
 const {race,profession}=resolveProgressionPair(state,offer.raceId,offer.classId),issues=pairIssues(state,race,profession,context).filter(i=>!offer.waivers.includes(i.code));
 if(issues.length)throw new RangeError(issues.map(i=>i.message).join(' '));
 const options=[race,profession];
 if(race.id==='primal'){const original=PREMADE_OPTIONS.find(o=>o.id===state.evidence.facts.originalRace&&o.kind==='race'&&o.id!=='primal');if(!original)throw new RangeError('GM must verify a supported original Race for Primal.');options.unshift(original);}
 const stats={...context.stats},grants:Record<string,number>={},caps=new Set<string>(),applied:string[]=[];let dr=defenseBase,move=race.move??20;const step=race.step??10;
 const validSkip:string[]=[];
 for(const option of options){
  validSkip.push(`${option.id}:penalties`,`${option.id}:split`);
  for(const stat of STAT_KEYS){const key=`${option.id}:stat:${stat}`;validSkip.push(key);if(!skip.includes(key)){stats[stat]+=option.stats[stat];if(option.stats[stat])applied.push(key);}}
  if(Object.keys(option.skillPenalties).length&&!skip.includes(`${option.id}:penalties`))applied.push(`${option.id}:penalties`);
  for(const [id,n]of Object.entries(option.skills)){const key=`${option.id}:skill:${id}`;validSkip.push(key);if(!skip.includes(key)){grants[id]=(grants[id]??0)+n;applied.push(key);}}
  const drKey=`${option.id}:dr`;validSkip.push(drKey);if(!skip.includes(drKey)){dr+=option.dr;if(option.dr)applied.push(drKey);}
  for(const id of option.rank20)caps.add(id);for(const group of option.rank20Groups)for(const id of BUILD_GROUPS[group]??[])caps.add(id);
  for(const group of option.choices){const key=`${option.id}.${group.id}`,ids=choices[key];if(!Array.isArray(ids)||ids.length!==group.count||new Set(ids).size!==ids.length||ids.some(id=>!group.ids.includes(id)))throw new RangeError(`Complete ${option.name}: ${group.label}.`);for(const id of ids){if(group.cap20)caps.add(id);const choiceKey=`${option.id}:choice:${group.id}:${id}`;validSkip.push(choiceKey);if(!skip.includes(choiceKey)&&group.bonus){grants[id]=(grants[id]??0)+group.bonus;applied.push(choiceKey);}}}
  if(option.splitStats){let total=0;for(const stat of STAT_KEYS){const n=whole(split[option.id]?.[stat]??0,0,option.splitStats.total);if(!option.splitStats.keys.includes(stat)&&n)throw new RangeError('Stat split uses an unavailable Stat.');if(!skip.includes(`${option.id}:split`))stats[stat]+=n;total+=n;}if(total!==option.splitStats.total)throw new RangeError(`Distribute exactly ${option.splitStats.total} bonus points for ${option.name}.`);if(!skip.includes(`${option.id}:split`))applied.push(`${option.id}:split`);}
 }
 if(Object.keys(choices).length!==options.reduce((n,o)=>n+o.choices.length,0))throw new RangeError('Unexpected benefit choices.');
 if(skip.some(id=>!validSkip.includes(id))||new Set(skip).size!==skip.length)throw new RangeError('Choose valid individual already-applied benefits.');
 const skills=[...context.skills];
 for(const [id,amount]of Object.entries(grants)){
  const definition=PROGRESSION_ABILITIES.find(a=>a.id===id);if(!definition||id==='heal')throw new RangeError(`Review ability definition: ${id}.`);
  const index=skills.findIndex(s=>s.id===id||s.name.toLowerCase()===definition.name.toLowerCase()),old=skills[index];
  if(old&&(old.kind!==definition.kind||old.name.toLowerCase()!==definition.name.toLowerCase()))throw new RangeError(`Conflicting definition for ${definition.name}; GM review required.`);
  const overridden=offer.waivers.includes('selection-rank-cap');
  const maxRank=caps.has(id)||overridden?20:old?.maxRank??definition.maxRank,rank=amount<0?(old?.rank??0)+amount:Math.max(old?.rank??0,Math.min(overridden?20:10,maxRank,(old?.rank??0)+amount));
  if(rank<0)throw new RangeError('Cannot remove unlearned Skill ranks.');
  if(rank===0){if(index>=0)skills.splice(index,1);continue;}
  const next=restoreAbility({...definition,...old,id:old?.id??id,rank,maxRank,marked:old?.marked&&rank<15||false,origin:old?.origin??'gm'});
  if(index>=0)skills[index]=next;else skills.push(next);
 }
 const adjusted=skills.flatMap(s=>{let rank=s.rank;for(const o of options)if(rank>0&&s.stat&&!skip.includes(`${o.id}:penalties`))rank=Math.max(o.id==='mage'?1:0,rank+(o.skillPenalties[s.stat]??0));return rank===0?[]:[restoreAbility({...s,rank,maxRank:caps.has(s.id)?20:s.maxRank})];});
 for(const stat of STAT_KEYS)whole(stats[stat],1,10000);
 const defenses=mergeSelectionDefenses(baseDefenses,options.map(o=>o.defenses));
 for(const option of options)for(const [stat,cap]of Object.entries(option.statCaps))stats[stat as keyof Scores]=Math.min(stats[stat as keyof Scores],cap!);
 if(race.id==='tigran')move+=10;
 return{race,profession,stats,skills:restoreAbilities(adjusted),dr:whole(dr,0,10000),defenses,move,step,size:['doppelganger','primal'].includes(race.id)?whole(state.evidence.facts.originalSize??4,1,8):race.size,applied,skipped:skip,waivers:offer.waivers};
}
