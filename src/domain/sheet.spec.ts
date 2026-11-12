import { describe,expect,it } from 'vitest';
import { DAMAGE_TYPES,derivedBaseline,restoreEffects,typedDamage,type StatEffect,type DamagePart } from './sheet';
import { abilityCheckBonus,restoreAbility,ABILITY_CATALOG } from './abilities';
import { createTutorialProfile } from './tutorial';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
const bases={strength:10,intelligence:10,constitution:10,dexterity:10,charisma:10};
const effect:StatEffect={id:'buff',name:'Test buff',active:true,modifiers:{strength:2,intelligence:-3,constitution:0,dexterity:1,charisma:0}};
describe('typed damage per hit',()=>{
 it.each(DAMAGE_TYPES)('supports ruleset/special type %s',(type)=>{expect(typedDamage(10,10,4,[{type,amount:8}]).slots).toBe(type==='Armor Piercing'?8:9);});
 it('subtracts DR once for repeated components of the same type',()=>{expect(typedDamage(10,10,4,[{type:'Fire',amount:4},{type:'Fire',amount:4}])).toEqual({net:4,slots:9});});
 it('subtracts DR per distinct type and sums net damage before slot conversion',()=>{expect(typedDamage(10,10,3,[{type:'Fire',amount:5},{type:'Ice',amount:5}])).toEqual({net:4,slots:9});});
 it('does not reapply DR to Armor Piercing portions',()=>{expect(typedDamage(10,10,5,[{type:'Piercing',amount:7},{type:'Armor Piercing',amount:6}])).toEqual({net:8,slots:8});});
 it('discards sub-slot damage and clamps at zero',()=>{expect(typedDamage(10,10,0,[{type:'Fire',amount:3}]).slots).toBe(10);expect(typedDamage(1,10,0,[{type:'Fire',amount:1000}]).slots).toBe(0);expect(typedDamage(10,10,100,[{type:'Fire',amount:10}]).net).toBe(0);});
 it.each([{parts:[]},{parts:[{type:'Laser',amount:3}]},{parts:[{type:'Fire',amount:0}]},{parts:[{type:'Fire',amount:1.5}]},{parts:[{type:'Fire',amount:1000000001}]}])('rejects invalid damage %s',({parts})=>{expect(()=>typedDamage(10,10,0,parts as DamagePart[])).toThrow();});
});
describe('derived stat sources',()=>{
 it('adds only active signed modifiers without mutating Unenhanced stats',()=>{const stats=derivedBaseline(bases,[effect,{...effect,id:'inactive',active:false,modifiers:{...effect.modifiers,strength:100}}]);expect(stats.strength).toEqual({base:10,enhanced:12});expect(stats.intelligence).toEqual({base:10,enhanced:7});expect(bases.strength).toBe(10);});
 it('removes contributions immediately on deactivation and clamps non-gear scores',()=>{expect(derivedBaseline(bases,[{...effect,active:false}]).strength.enhanced).toBe(10);expect(derivedBaseline(bases,[{...effect,modifiers:{...effect.modifiers,strength:-10000,intelligence:10000}}]).strength.enhanced).toBe(1);expect(derivedBaseline(bases,[{...effect,modifiers:{...effect.modifiers,intelligence:10000}}]).intelligence.enhanced).toBe(10000);});
 it.each([{active:'true'},{name:''},{modifiers:{}},{modifiers:{...effect.modifiers,strength:1.5}},{id:'bad!'}])('rejects invalid modifier %s',(patch)=>{expect(()=>restoreEffects([{...effect,...patch}])).toThrow();});
 it('rejects duplicate identifiers and excessive entries',()=>{expect(()=>restoreEffects([effect,effect])).toThrow();expect(()=>restoreEffects(Array.from({length:101},(_,i)=>({...effect,id:String(i)})))).toThrow();});
 it('uses awarded ranks above 15 only from Floor 6',()=>{const skill=restoreAbility({...ABILITY_CATALOG.find((row)=>row.id==='longsword')!,rank:20,maxRank:20,origin:'gm',marked:false}),p=createTutorialProfile(tutorialDraftFixture());expect(abilityCheckBonus(skill,p,5)).toBe(16);expect(abilityCheckBonus(skill,p,6)).toBe(21);});
});
