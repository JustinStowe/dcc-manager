import { bounded } from './loadout';
import { DAMAGE_TYPES, type DamagePart, type DamageType } from './damage-types';
import { tutorialModifier } from './tutorial';
export const DEFENSE_TYPES=DAMAGE_TYPES.filter((type)=>type!=='Armor Piercing');
export type DefenseType=typeof DEFENSE_TYPES[number];
export interface TypeDefense {readonly resistant:boolean;readonly vulnerable:boolean;readonly immune:boolean}
export type TypedDefenses=Readonly<Partial<Record<DefenseType,TypeDefense>>>;
export function restoreDefenses(value:unknown):TypedDefenses {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new RangeError('Expected typed defenses.');
  const result:Partial<Record<DefenseType,TypeDefense>>={};
  for(const [key,raw]of Object.entries(value)){
    if(!DEFENSE_TYPES.includes(key as DefenseType)||!raw||typeof raw!=='object'||Array.isArray(raw))throw new RangeError('Choose a ruleset defense type.');
    const row=raw as Record<string,unknown>;
    if(Object.keys(row).length!==3||typeof row.resistant!=='boolean'||typeof row.vulnerable!=='boolean'||typeof row.immune!=='boolean')throw new RangeError('Choose resistance, vulnerability, and immunity as true or false.');
    if(row.resistant||row.vulnerable||row.immune)result[key as DefenseType]={resistant:row.resistant,vulnerable:row.vulnerable,immune:row.immune};
  }
  return result;
}
export interface DamageCalculation {readonly net:number;readonly slots:number;readonly lost:number;readonly threshold:number;readonly portions:readonly {readonly type:DamageType;readonly raw:number;readonly drApplied:number;readonly afterDr:number;readonly afterResistance:number;readonly afterVulnerability:number;readonly final:number;readonly immune:boolean}[]}
export function resolveTypedDamage(slots:number,constitution:number,dr:number,parts:readonly DamagePart[],defenses:TypedDefenses={}):DamageCalculation {
  bounded(slots,0,10);bounded(dr,0,1000000);const checked=restoreDefenses(defenses),threshold=tutorialModifier(constitution);
  if(!Array.isArray(parts)||parts.length<1||parts.length>30)throw new RangeError('Enter 1–30 damage components for one hit.');
  const grouped=new Map<DamageType,number>();
  for(const part of parts){if(!part||!DAMAGE_TYPES.includes(part.type))throw new RangeError('Choose a ruleset damage type.');grouped.set(part.type,(grouped.get(part.type)??0)+bounded(part.amount,1,1000000000));}
  const portions=[...grouped].map(([type,raw])=>{
    const defense=type==='Armor Piercing'?undefined:checked[type];
    const drApplied=type==='Armor Piercing'?0:Math.min(raw,dr),afterDr=raw-drApplied;
    const afterResistance=defense?.resistant?Math.floor(afterDr/2):afterDr;
    const afterVulnerability=defense?.vulnerable?afterResistance*2:afterResistance;
    return {type,raw,drApplied,afterDr,afterResistance,afterVulnerability,final:defense?.immune?0:afterVulnerability,immune:defense?.immune??false};
  });
  const net=portions.reduce((sum,part)=>sum+part.final,0),after=Math.max(0,slots-Math.floor(net/threshold));
  return {net,slots:after,lost:slots-after,threshold,portions};
}
