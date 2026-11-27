import { z } from 'zod';
import { GEAR_SLOTS, ITEM_EFFECTS, ITEM_KINDS, validateInventory, validateItemDraft, type InventoryItem } from './inventory';
import { ZERO_BONUSES, restoreBonuses } from './loadout';
import { sequenceSchema } from './hud';

export const LOOT_TIERS = ['bronze', 'silver', 'gold', 'platinum', 'legendary', 'celestial'] as const;
export const tierLabel = (tier: typeof LOOT_TIERS[number]) => tier[0].toUpperCase() + tier.slice(1);
const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => text(max).min(1);
const date = z.iso.datetime({ offset: true });
const bonuses = z.strictObject(Object.fromEntries(Object.keys(ZERO_BONUSES).map(k => [k, z.number().int().min(0).max(1000)])) as Record<keyof typeof ZERO_BONUSES, z.ZodNumber>);
export const lootItemDraftSchema = z.strictObject({
  name: required(120), kind: z.enum(ITEM_KINDS), quantity: z.number().int().min(1).max(999999), notes: text(2000),
  gearSlot: z.enum(GEAR_SLOTS), effect: z.enum(ITEM_EFFECTS), bonuses,
}).superRefine((item, context) => {
  try { validateItemDraft(item); if (item.gearSlot === 'none' && Object.values(item.bonuses).some(n => n !== 0)) throw new Error('Bonuses require equippable gear.'); }
  catch (error) { context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Invalid reward item.' }); }
});
export const boxDraftSchema = z.strictObject({ tier: z.enum(LOOT_TIERS), name: required(120), category: required(80), flavor: text(2000), aiNote: text(2000), guideNote: text(2000), voteLocked: z.boolean(), sourceAchievementId: z.uuid().nullable(), items: z.array(lootItemDraftSchema).min(1).max(20) });
export const achievementDraftSchema = z.strictObject({ title: required(120), floor: z.number().int().min(1).max(18), trigger: required(1000), description: required(2000), rewardText: text(1000) });
export const safeRoomCommandSchema = z.discriminatedUnion('operation', [
  z.strictObject({ operation: z.literal('award'), requestId: z.uuid(), reviewed: z.literal(true), existing: z.boolean(), source: z.enum(['manual', 'earth-incentive']), achievement: achievementDraftSchema.nullable(), box: boxDraftSchema.nullable() }).refine(c => c.achievement !== null || c.box !== null, 'Add an achievement or a box.'),
  z.strictObject({ operation: z.literal('access'), floor: z.number().int().min(1).max(18), version: z.uuid().nullable(), allowed: z.boolean() }),
  z.strictObject({ operation: z.literal('open'), boxId: z.uuid(), version: z.uuid() }),
  z.strictObject({ operation: z.literal('claim'), boxId: z.uuid(), version: z.uuid(), crawlerVersion: z.uuid(), itemId: z.uuid().nullable() }),
  z.strictObject({ operation: z.literal('unlock'), boxId: z.uuid(), version: z.uuid(), confirmed: z.literal(true) }),
  z.strictObject({ operation: z.literal('read'), achievementId: z.uuid() }),
  z.strictObject({ operation: z.literal('read-all'), through: sequenceSchema }),
  z.strictObject({ operation: z.literal('reconcile-incentive'), reviewed: z.literal(true), note: required(500) }),
]);
export type SafeRoomCommand = z.infer<typeof safeRoomCommandSchema>;
export type LootItemDraft = z.infer<typeof lootItemDraftSchema>;
export const rewardItemSchema = z.strictObject({ id: z.uuid(), item: lootItemDraftSchema, claimedAt: date.nullable() });
export const lootBoxSchema = z.strictObject({
  id: z.uuid(), sequence: sequenceSchema, version: z.uuid(), name: z.string(), category: z.string(), tier: z.enum(LOOT_TIERS),
  flavor: z.string(), aiNote: z.string(), guideNote: z.string(), sourceAchievementId: z.uuid().nullable(),
  voteLocked: z.boolean(), openedAt: date.nullable(), createdAt: date, existing: z.boolean(),
  status: z.enum(['unopened', 'opened', 'claimed']), items: z.array(rewardItemSchema).max(20).nullable(),
});
export const achievementSchema = z.strictObject({ id: z.uuid(), sequence: sequenceSchema, title: z.string(), floor: z.number().int(), trigger: z.string(), description: z.string(), rewardText: z.string(), boxId: z.uuid().nullable(), createdAt: date, readAt: date.nullable(), existing: z.boolean() });
export const safeRoomQuerySchema = z.strictObject({
  tier: z.enum(['all', ...LOOT_TIERS]).default('all'), hideClaimed: z.boolean().default(true),
  search: text(120).default(''), floor: z.enum(['all', '1', '2', '3', '4+']).default('all'), status: z.enum(['all', 'unread', 'with-box']).default('all'),
  boxBefore: sequenceSchema.optional(), achievementBefore: sequenceSchema.optional(), boxId: z.uuid().optional(), achievementId: z.uuid().optional(),
});
export const safeRoomSnapshotSchema = z.strictObject({
  crawlerId: z.uuid(), crawlerVersion: z.uuid(), floor: z.number().int().min(1).max(18),
  access: z.strictObject({ allowed: z.boolean(), version: z.uuid().nullable() }),
  boxes: z.array(lootBoxSchema).max(25), achievements: z.array(achievementSchema).max(30),
  selectedBox: lootBoxSchema.nullable(), selectedAchievement: achievementSchema.nullable(),
  boxMore: z.boolean(), achievementMore: z.boolean(), achievementHead: sequenceSchema,
  unopened: z.number().int().nonnegative(), achievementCount: z.number().int().nonnegative(), unreadAchievements: z.number().int().nonnegative(), storedEntries: z.number().int().nonnegative(),
  incentive: z.enum(['unreviewed', 'issue-once', 'already-received', 'declined', 'issued', 'reconciled']),
});
export type SafeRoomSnapshot = z.infer<typeof safeRoomSnapshotSchema>;
export type SafeRoomQuery = z.infer<typeof safeRoomQuerySchema>;
export type LootBox = z.infer<typeof lootBoxSchema>;
export type Achievement = z.infer<typeof achievementSchema>;

/** Receipt IDs become inventory IDs. Claimed rewards never re-enter inventory. */
export function previewLootClaim(inventory: readonly InventoryItem[], box: LootBox, itemId: string | null): readonly InventoryItem[] {
  if (!box.openedAt || box.voteLocked || !box.items) throw new RangeError('Open an unlocked box first.');
  if (itemId && !box.items.some(i => i.id === itemId)) throw new RangeError('Choose an item from this box.');
  const pending = box.items.filter(i => !i.claimedAt && (!itemId || i.id === itemId));
  return validateInventory([...inventory, ...pending.map(({ id, item }) => ({ ...validateItemDraft(item), id, location: 'stored' as const, bonuses: restoreBonuses(item.bonuses) }))]);
}
