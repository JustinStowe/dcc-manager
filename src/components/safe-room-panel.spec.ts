import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SafeRoomWorkspace } from './safe-room-panel';
import { SafeRoomAward } from './safe-room-award';
import { safeRoomFixture, REWARD_IDS as R } from '@/test/safe-room-fixture';
import { PG_IDS as I } from '@/test/progression-fixture';
const shared = vi.hoisted(() => ({ state: [] as unknown[], cursor: 0, save: vi.fn(), snapshot: null as unknown, query: null as unknown }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useState(initial: unknown) { const i = shared.cursor++; if (!(i in shared.state)) shared.state[i] = typeof initial === 'function' ? (initial as () => unknown)() : initial; return [shared.state[i], (v: unknown) => { shared.state[i] = typeof v === 'function' ? (v as (old: unknown) => unknown)(shared.state[i]) : v; }]; }, useEffect() {} }));
vi.mock('@/controllers/use-safe-room', () => ({ useSafeRoom: (_c: string, _id: string, query: unknown) => { shared.query = query; return { snapshot: shared.snapshot, pending: false, error: null, save: shared.save, refresh: vi.fn() }; } }));
type Node = { type: unknown; props: Record<string, unknown> };
function nodes(tree: unknown): Node[] { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== 'object' || !('props' in tree)) return []; const n = tree as Node; return [n, ...nodes(n.props.children)]; }
function render(gm = false) { shared.cursor = 0; return nodes(SafeRoomWorkspace({ campaignId: I.game, crawlerId: I.crawler, crawlerName: 'Carl', isGm: gm, crawlers: [], onPending: vi.fn(), onChanged: vi.fn() })); }
function button(text: string, gm = false) { const node = render(gm).find(n => n.type === 'button' && n.props.children === text); if (!node) throw new Error(`Missing ${text}`); return node; }
async function click(node: Node, event?: unknown) { await (node.props.onClick as (e?: unknown) => unknown)(event); }
beforeEach(() => { shared.state = []; shared.cursor = 0; shared.snapshot = safeRoomFixture(); shared.save.mockReset().mockResolvedValue(true); });
describe('Safe Room workflow boundaries', () => {
  it('does not show GM award/access/incentive controls to an owner', () => { expect(render().some(n => n.type === SafeRoomAward)).toBe(false); expect(render(true).some(n => n.type === SafeRoomAward)).toBe(true); });
  it('does not reveal sealed contents in the UI, even if a preview object contains them', () => { const s = safeRoomFixture(); shared.snapshot = { ...s, boxes: s.boxes.map(b => ({ ...b, openedAt: null, status: 'unopened' })) }; expect(render().some(n => n.props.children === 'Revealed rewards')).toBe(false); expect(button('Open box').props.disabled).toBe(false); });
  it('disables claims without current GM saferoom access', () => { const s = safeRoomFixture(); shared.snapshot = { ...s, access: { ...s.access, allowed: false } }; expect(button('Claim All').props.disabled).toBe(true); });
  it('sends authoritative box/crawler versions for a one-item claim', async () => { await click(button('Claim'), { currentTarget: { dataset: { id: R.item } } }); expect(shared.save).toHaveBeenCalledWith({ operation: 'claim', boxId: R.box, version: I.version, crawlerVersion: I.version, itemId: R.item }); });
  it('does not turn a failed claim into a local receipt or success notice', async () => { shared.save.mockResolvedValue(false); await click(button('Claim All')); expect(render().some(n => n.props.children === 'Claimed rewards are now in Inventory & equipment.')).toBe(false); expect(button('Claim')).toBeDefined(); });
  it('opens a linked reward outside queue filters using its permanent ID', async () => { await click(button('Achievements Codex')); await click(button('Open Reward Box')); const s = safeRoomFixture(); shared.snapshot = { ...s, boxes: [], selectedBox: s.boxes[0] }; expect(render().some(n => n.props['aria-label'] === 'Unboxing pedestal')).toBe(true); expect(shared.query).toMatchObject({ boxId: R.box }); });
  it('marks only the chosen achievement and uses the global seen watermark for Mark All Read', async () => { await click(button('Achievements Codex')); const entry = render().find(n => n.props['data-id'] === R.achievement)!; await click(entry, { currentTarget: { dataset: { id: R.achievement } } }); expect(shared.save).toHaveBeenCalledWith({ operation: 'read', achievementId: R.achievement }); await click(button('Mark All Read')); expect(shared.save).toHaveBeenLastCalledWith({ operation: 'read-all', through: '9007199254740995' }); });
});
