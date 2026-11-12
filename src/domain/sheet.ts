import { STAT_KEYS, tutorialModifier, type StatKey, type TutorialStats } from './tutorial';
import { bounded } from './loadout';
export const DAMAGE_TYPES = ['Acid','Bludgeoning','Electric','Fire','Force','Holy','Ice','Necrotic','Piercing','Poison','Psychic','Slashing','Sonic','Armor Piercing'] as const;
export type DamageType = typeof DAMAGE_TYPES[number];
export interface DamagePart { readonly type: DamageType; readonly amount: number }
export interface StatEffect { readonly id: string; readonly name: string; readonly active: boolean; readonly modifiers: Readonly<Record<StatKey,number>> }
export interface SheetMetadata { readonly level: number; readonly floor: number; readonly effects: readonly StatEffect[] }
export function restoreEffects(value: unknown): readonly StatEffect[] {
  if (!Array.isArray(value) || value.length>100) throw new RangeError('Expected up to 100 stat modifiers.');
  const ids=new Set<string>();
  return value.map((entry: unknown) => {
    if (!entry || typeof entry!=='object') throw new RangeError('Invalid modifier.');
    const row=entry as Record<string,unknown>, mods=row.modifiers as Record<string,unknown>;
    if (typeof row.id!=='string' || !/^[a-z0-9-]{1,80}$/.test(row.id) || ids.has(row.id) || typeof row.name!=='string' || !row.name.trim() || Array.from(row.name).length>120 || typeof row.active!=='boolean' || !mods || Object.keys(mods).length!==5) throw new RangeError('Check modifier details.');
    ids.add(row.id);
    return {id:row.id,name:row.name.trim(),active:row.active,modifiers:Object.fromEntries(STAT_KEYS.map((key)=>[key,bounded(mods[key],-10000,10000)])) as unknown as StatEffect['modifiers']};
  });
}
export function derivedBaseline(bases: Readonly<Record<StatKey,number>>, effects: readonly StatEffect[]): TutorialStats {
  const checked=restoreEffects(effects);
  return Object.fromEntries(STAT_KEYS.map((key)=>{const base=bounded(bases[key],1,10000);const bonus=checked.filter((effect)=>effect.active).reduce((total,effect)=>total+effect.modifiers[key],0);return [key,{base,enhanced:Math.max(1,Math.min(10000,base+bonus))}];})) as TutorialStats;
}
export function typedDamage(slots: number, constitution: number, dr: number, parts: readonly DamagePart[]) {
  bounded(slots,0,10);bounded(dr,0,1000000);
  if (!Array.isArray(parts) || parts.length<1 || parts.length>30) throw new RangeError('Enter 1–30 damage components for one hit.');
  const grouped=new Map<DamageType,number>();
  for (const part of parts) {
    if (!part || !DAMAGE_TYPES.includes(part.type)) throw new RangeError('Choose a ruleset damage type.');
    grouped.set(part.type,(grouped.get(part.type)??0)+bounded(part.amount,1,1000000000));
  }
  const net=[...grouped].reduce((total,[type,amount])=>total+Math.max(0,amount-(type==='Armor Piercing'?0:dr)),0);
  return {net,slots:Math.max(0,slots-Math.floor(net/tutorialModifier(constitution)))};
}
