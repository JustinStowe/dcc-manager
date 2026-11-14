import { describe,expect,it } from 'vitest';
import { DEFENSE_TYPES,restoreDefenses,resolveTypedDamage,type TypeDefense } from './typed-defenses';
import { typedDamage } from './sheet';
const resistance:TypeDefense={resistant:true,vulnerable:false,immune:false};
const vulnerability:TypeDefense={resistant:false,vulnerable:true,immune:false};
const immunity:TypeDefense={resistant:false,vulnerable:false,immune:true};
describe('typed defense definitions',()=>{
 it.each(DEFENSE_TYPES)('accepts the ruleset type %s',(type)=>{expect(restoreDefenses({[type]:resistance})[type]).toEqual(resistance);});
 it('stores only effective flags and permits simultaneous conditions',()=>{expect(restoreDefenses({Fire:{resistant:false,vulnerable:false,immune:false}})).toEqual({});expect(restoreDefenses({Fire:{resistant:true,vulnerable:true,immune:true}}).Fire?.immune).toBe(true);});
 it.each([null,[],{Laser:resistance},{'Armor Piercing':immunity},{Fire:{resistant:1,vulnerable:false,immune:false}},{Fire:{resistant:true}},{Fire:{...resistance,extra:true}}].map((value)=>({value})))('rejects invalid definitions %s',({value})=>{expect(()=>restoreDefenses(value)).toThrow();});
 it('returns independent data without mutating the input',()=>{const input={Fire:{...resistance}};const restored=restoreDefenses(input);input.Fire.resistant=false;expect(restored.Fire?.resistant).toBe(true);});
});
describe('ordered damage defenses',()=>{
 it('applies DR before rounding resistance down',()=>{const result=resolveTypedDamage(10,10,4,[{type:'Fire',amount:13}],{Fire:resistance});expect(result.net).toBe(4);expect(result.slots).toBe(9);expect(result.portions[0]).toEqual({type:'Fire',raw:13,drApplied:4,afterDr:9,afterResistance:4,afterVulnerability:4,final:4,immune:false});});
 it('doubles after DR for vulnerability',()=>{expect(typedDamage(10,10,4,[{type:'Ice',amount:9}],{Ice:vulnerability})).toEqual({net:10,slots:8});});
 it('rounds resistance before applying vulnerability, rather than cancelling multipliers',()=>{expect(typedDamage(10,10,4,[{type:'Fire',amount:13}],{Fire:{...resistance,vulnerable:true}})).toEqual({net:8,slots:8});});
 it('applies immunity last even when resistance and vulnerability are set',()=>{expect(typedDamage(10,10,4,[{type:'Fire',amount:100}],{Fire:{resistant:true,vulnerable:true,immune:true}})).toEqual({net:0,slots:10});});
 it('groups repeated types before DR and resistance and combines distinct types once',()=>{expect(typedDamage(10,10,4,[{type:'Fire',amount:4},{type:'Fire',amount:9},{type:'Ice',amount:9},{type:'Poison',amount:100}],{Fire:resistance,Ice:vulnerability,Poison:immunity})).toEqual({net:14,slots:7});});
 it('does not grant resistance to another type or infer source stacking',()=>{expect(typedDamage(10,10,0,[{type:'Ice',amount:8}],{Fire:resistance})).toEqual({net:8,slots:8});expect(typedDamage(10,10,0,[{type:'Fire',amount:8}],{Fire:resistance})).toEqual({net:4,slots:9});});
 it('keeps the existing untyped Armor Piercing bypass neutral',()=>{expect(typedDamage(10,10,99,[{type:'Armor Piercing',amount:8}],{Piercing:immunity,Fire:immunity})).toEqual({net:8,slots:8});});
 it('never turns over-reduced damage negative and cannot heal from damage',()=>{expect(typedDamage(10,10,100,[{type:'Fire',amount:3}],{Fire:resistance})).toEqual({net:0,slots:10});expect(typedDamage(0,10,0,[{type:'Ice',amount:100}],{Ice:vulnerability}).slots).toBe(0);});
 it('supports maximum input size without numeric overflow',()=>{const result=resolveTypedDamage(10,10,0,Array.from({length:30},()=>({type:'Fire' as const,amount:1000000000})),{Fire:vulnerability});expect(result.net).toBe(60000000000);expect(result.slots).toBe(0);});
});
