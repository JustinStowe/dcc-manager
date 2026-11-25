import { STAT_KEYS, type StatKey, type TutorialStats } from './tutorial';
import { resolveTypedDamage, type TypedDefenses } from './typed-defenses';
import type { EffectLinks } from './effect-templates';
import type { TrackedEffect } from './tracked-effects';
import type { AdvancementState, AdvancementEvent } from './advancement';
import { bounded } from './loadout';
export { DAMAGE_TYPES } from './damage-types';
export type { DamageType, DamagePart } from './damage-types';
import type { DamagePart } from './damage-types';
export interface StatEffect { readonly id: string; readonly name: string; readonly active: boolean; readonly modifiers: Readonly<Record<StatKey,number>> }
export interface SheetMetadata { readonly level: number; readonly floor: number; readonly effects: readonly StatEffect[]; readonly defenses?: TypedDefenses; readonly baseDefenses?: TypedDefenses; readonly trackedEffects?: readonly TrackedEffect[]; readonly links?: EffectLinks; readonly advancement?: AdvancementState; readonly advancementHistory?: readonly AdvancementEvent[] }
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
export function typedDamage(slots: number, constitution: number, dr: number, parts: readonly DamagePart[], defenses: TypedDefenses = {}) {
  const {net,slots:after}=resolveTypedDamage(slots,constitution,dr,parts,defenses);
  return {net,slots:after};
}
