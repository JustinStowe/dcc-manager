export const DAMAGE_TYPES = ['Acid','Bludgeoning','Electric','Fire','Force','Holy','Ice','Necrotic','Piercing','Poison','Psychic','Slashing','Sonic','Armor Piercing'] as const;
export type DamageType = typeof DAMAGE_TYPES[number];
export interface DamagePart { readonly type: DamageType; readonly amount: number }
