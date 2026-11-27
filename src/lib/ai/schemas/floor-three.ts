import { z } from 'zod';
import { BUILD_TRAITS } from '@/domain/custom-build';
export const suggestionsSchema=z.strictObject({recommendations:z.array(z.strictObject({raceId:z.string().min(1).max(80),classId:z.string().min(1).max(80),reason:z.string().min(1).max(400),commentary:z.string().min(1).max(500)})).min(1).max(3)});
export type ClassSuggestions=z.infer<typeof suggestionsSchema>;
export const selectionSuggestionsSchema=z.strictObject({races:z.array(z.strictObject({raceId:z.string().min(1).max(80),reason:z.string().min(1).max(400),commentary:z.string().min(1).max(500)})).min(1).max(3),classes:z.array(z.strictObject({raceId:z.string().min(1).max(80),classId:z.string().min(1).max(80),reason:z.string().min(1).max(400),commentary:z.string().min(1).max(500)})).min(1).max(3)});
export type SelectionSuggestions=z.infer<typeof selectionSuggestionsSchema>;
export const customBuildSchema=z.strictObject({kind:z.enum(['race','class']),name:z.string().min(1).max(100),earth:z.boolean(),description:z.string().max(1200),lines:z.array(z.strictObject({traitId:z.enum(BUILD_TRAITS.map(t=>t.id)as[string,...string[]]),target:z.string().max(80),quantity:z.number().int().min(1).max(30)})).min(1).max(30)});
export const aiRequestSchema=z.strictObject({campaignId:z.uuid(),crawlerId:z.uuid(),version:z.uuid(),purpose:z.enum(['class-suggestions','selection-suggestions','custom-build']),raceId:z.string().max(80),kind:z.enum(['race','class']),earth:z.boolean(),theme:z.string().max(800)});
