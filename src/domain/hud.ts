import { z } from 'zod';

export const ALERT_CATEGORIES = ['System AI', 'Achievement', 'Floor Alert', 'Loot'] as const;
export const sequenceSchema = z.string().regex(/^\d{1,19}$/).pipe(z.string().refine(s => BigInt(s) <= 9223372036854775807n, 'Invalid notification cursor.'));
const date = z.iso.datetime({ offset: true });
export const floorTimerSchema = z.strictObject({
  floor: z.number().int().min(1).max(18), version: z.uuid(),
  running: z.boolean(), deadline: date.nullable(), remaining: z.number().int().min(0).max(31536000),
});
export const notificationSchema = z.strictObject({
  sequence: sequenceSchema, category: z.enum(ALERT_CATEGORIES), title: z.string().min(1).max(120),
  body: z.string().max(2000), createdAt: date, readAt: date.nullable(),
  crawlerId: z.uuid().nullable(), floor: z.number().int().min(1).max(18).nullable(),
});
export const hudSnapshotSchema = z.strictObject({
  events: z.array(notificationSchema).max(30), unread: z.number().int().nonnegative(),
  head: sequenceSchema, hasMore: z.boolean(), serverNow: date, timer: floorTimerSchema.nullable(),
});
export type FloorTimer = z.infer<typeof floorTimerSchema>;
export type TableNotification = z.infer<typeof notificationSchema>;
export type HudSnapshot = z.infer<typeof hudSnapshotSchema>;

export const hudCommandSchema = z.discriminatedUnion('operation', [
  z.strictObject({ operation: z.literal('broadcast'), requestId: z.uuid(), category: z.enum(ALERT_CATEGORIES), title: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(2000), crawlerId: z.uuid().nullable() }),
  z.strictObject({ operation: z.literal('read'), sequence: sequenceSchema }),
  z.strictObject({ operation: z.literal('read-all'), through: sequenceSchema }),
  z.strictObject({ operation: z.literal('timer-set'), floor: z.number().int().min(1).max(18), version: z.uuid().nullable(), seconds: z.number().int().min(0).max(31536000), start: z.boolean() }),
  z.strictObject({ operation: z.enum(['timer-pause', 'timer-resume', 'timer-clear']), floor: z.number().int().min(1).max(18), version: z.uuid() }),
]);
export type HudCommand = z.infer<typeof hudCommandSchema>;

export function timerSeconds(timer: FloorTimer | null, now: number): number | null {
  if (!timer) return null;
  return timer.running && timer.deadline ? Math.max(0, Math.ceil((Date.parse(timer.deadline) - now) / 1000)) : timer.remaining;
}
export function formatCountdown(seconds: number | null): string {
  if (seconds === null) return 'Not set';
  const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600);
  const time = [hours, Math.floor(seconds % 3600 / 60), seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
  return `${days ? `${days}d ` : ''}${time}`;
}
/** Only fresh, previously unseen events may become banners; history stays in the drawer. */
export function freshBanners(snapshot: HudSnapshot, previousHead: string | null): TableNotification[] {
  if (previousHead === null) return [];
  const now = Date.parse(snapshot.serverNow);
  return snapshot.events.filter(e => BigInt(e.sequence) > BigInt(previousHead) && !e.readAt && now - Date.parse(e.createdAt) <= 15000 && now >= Date.parse(e.createdAt)).reverse().slice(-3);
}
