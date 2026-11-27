import { describe, expect, it } from 'vitest';
import { floorTimerSchema, formatCountdown, freshBanners, hudCommandSchema, sequenceSchema, timerSeconds, type HudSnapshot } from './hud';
const now = '2026-11-27T18:00:00.000Z';
const timer = { floor: 3, version: '11111111-1111-4111-8111-111111111111', running: true, deadline: '2026-11-27T18:01:00.000Z', remaining: 60 };
function snapshot(): HudSnapshot { return { timer, serverNow: now, unread: 4, head: '9007199254740995', hasMore: false, events: [
  { sequence: '9007199254740995', category: 'Achievement', title: 'Fresh', body: 'A GM award.', createdAt: now, readAt: null, crawlerId: null, floor: 3 },
  { sequence: '9007199254740994', category: 'System AI', title: 'Old', body: '', createdAt: '2026-11-27T17:59:00.000Z', readAt: null, crawlerId: null, floor: null },
] }; }
describe('HUD countdown and notification rules', () => {
  it('counts from the shared deadline, freezes paused timers and clamps expiration', () => {
    expect(timerSeconds(timer, Date.parse(now))).toBe(60);
    expect(timerSeconds(timer, Date.parse(now) + 30500)).toBe(30);
    expect(timerSeconds(timer, Date.parse(now) + 100000)).toBe(0);
    expect(timerSeconds({ ...timer, running: false, deadline: null }, Date.parse(now) + 100000)).toBe(60);
    expect(timerSeconds(null, 0)).toBeNull();
  });
  it.each([[null, 'Not set'], [0, '00:00:00'], [3661, '01:01:01'], [172861, '2d 00:01:01']] as const)('formats %s seconds', (seconds, text) => expect(formatCountdown(seconds)).toBe(text));
  it('never replays initial history, seen, old or read events as banners', () => {
    const s = snapshot(); expect(freshBanners(s, null)).toEqual([]); expect(freshBanners(s, s.head)).toEqual([]);
    expect(freshBanners(s, '9007199254740993').map(e => e.title)).toEqual(['Fresh']);
    expect(freshBanners({ ...s, events: s.events.map(e => ({ ...e, readAt: now })) }, '0')).toEqual([]);
  });
  it('preserves bigint cursor precision and rejects invalid or overflowing values', () => {
    expect(sequenceSchema.parse('9007199254740995')).toBe('9007199254740995');
    for (const value of ['-1', '1.5', '1e4', '9223372036854775808']) expect(sequenceSchema.safeParse(value).success).toBe(false);
  });
  it('strictly checks bounds and rejects unrecognized mutation fields', () => {
    expect(floorTimerSchema.safeParse({ ...timer, floor: 19 }).success).toBe(false);
    const command = { operation: 'timer-set', floor: 3, version: null, seconds: 10, start: true };
    expect(hudCommandSchema.safeParse(command).success).toBe(true);
    for (const seconds of [-1, .5, 31536001]) expect(hudCommandSchema.safeParse({ ...command, seconds }).success).toBe(false);
    expect(hudCommandSchema.safeParse({ ...command, grantPoints: true }).success).toBe(false);
  });
});
