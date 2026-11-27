import { z } from 'zod';
export const SELECTION_FLOORS = [3, 6, 9, 12] as const;
export type SelectionFloor = typeof SELECTION_FLOORS[number];
export const specializationDraftSchema = z.array(z.strictObject({name:z.string().trim().min(1).max(100),benefits:z.string().trim().min(1).max(2000)})).min(1).max(3);
const optionSchema = z.strictObject({id:z.uuid(),name:z.string().min(1).max(100),benefits:z.string().min(1).max(2000)});
const deliverySchema = z.strictObject({id:z.uuid(),floor:z.union([z.literal(3),z.literal(6),z.literal(9),z.literal(12)]),status:z.enum(['draft','open','closed','completed']),catalog:z.boolean().optional(),options:z.array(optionSchema).max(3),choice:optionSchema.nullable(),sentAt:z.string().nullable(),completedAt:z.string().nullable()});
const stateSchema = z.strictObject({deliveries:z.array(deliverySchema).max(4)});
export type SelectionDelivery = z.infer<typeof deliverySchema>;
export type SelectionMenuState = z.infer<typeof stateSchema>;
export const INITIAL_SELECTION_MENUS:SelectionMenuState={deliveries:[]};
export function isSelectionFloor(floor:number):floor is SelectionFloor{return SELECTION_FLOORS.some(f=>f===floor);}
export function restoreSelectionMenus(value:unknown):SelectionMenuState{
 const state=value==null?INITIAL_SELECTION_MENUS:stateSchema.parse(value);
 if(new Set(state.deliveries.map(d=>d.floor)).size!==state.deliveries.length)throw new RangeError('Duplicate selection milestone.');
 return state;
}
export function pendingSelectionMenu(state:SelectionMenuState|undefined,floor:number){return state?.deliveries.find(d=>d.floor===floor&&d.status==='open');}
export function latestSpecialization(state:SelectionMenuState|undefined){return state?.deliveries.filter(d=>d.floor>3&&d.status==='completed'&&d.choice).sort((a,b)=>b.floor-a.floor)[0]?.choice;}
