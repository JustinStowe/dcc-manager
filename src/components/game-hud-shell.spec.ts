import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameHudShell, Notifications } from './game-hud-shell';
import { BroadcastForm, TimerControls } from './hud-controls';
import { SheetModal } from './sheet-modal';
import type { HudSnapshot } from '@/domain/hud';
import { PG_IDS as I } from '@/test/progression-fixture';
const shared = vi.hoisted(() => ({ state: [] as unknown[], cursor: 0, save: vi.fn(), refresh: vi.fn(), error: null as string | null }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useState(initial: unknown) { const i = shared.cursor++; if (!(i in shared.state)) shared.state[i] = typeof initial === 'function' ? (initial as () => unknown)() : initial; return [shared.state[i], (v: unknown) => { shared.state[i] = typeof v === 'function' ? (v as (old: unknown) => unknown)(shared.state[i]) : v; }]; }, useRef(initial: unknown) { const i = shared.cursor++; if (!(i in shared.state)) shared.state[i] = { current: initial }; return shared.state[i]; }, useEffect() {} }));
vi.mock('@/app/campaign/hud-actions', () => ({ changeHud: (...args: unknown[]) => shared.save(...args), readHud: vi.fn() }));
vi.mock('@/controllers/use-hud', () => ({ useHud: (_c: string, _f: number, snapshot: HudSnapshot | null) => ({ snapshot, error: shared.error, banners: [], refresh: shared.refresh, dismissBanner: vi.fn() }) }));
type Node = { type: unknown; props: Record<string, unknown> };
function nodes(tree: unknown): Node[] { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== 'object' || !('props' in tree)) return []; const n = tree as Node; return [n, ...nodes(n.props.children)]; }
const timer = { floor: 3, running: false, deadline: null, remaining: 3600, version: I.version };
const snapshot: HudSnapshot = { timer, events: [], unread: 7, head: '12', serverNow: '2026-11-27T18:00:00Z', hasMore: false };
function shell(gm: boolean) { shared.cursor = 0; return nodes(GameHudShell({ campaignId: I.game, floor: 3, isGm: gm, crawlers: [], initial: snapshot, initialError: null, children: 'Existing sheet' })); }
async function click(node: Node) { await (node.props.onClick as () => unknown)(); }
beforeEach(() => { shared.state = []; shared.cursor = 0; shared.error = null; shared.save.mockReset().mockResolvedValue({ error: null, snapshot }); shared.refresh.mockReset(); });
describe('HUD roles and existing workspace', () => {
  it('keeps the sheet mounted and exposes an unread badge without opening a drawer', () => { const tree = shell(false); expect(tree.some(n => n.props.children === 'Existing sheet')).toBe(false); expect(tree[0].props.children).toContain('Existing sheet'); expect(tree.find(n => n.props['aria-label'] === '7 unread')).toBeDefined(); expect(tree.find(n => n.type === SheetModal)?.props.open).toBe(false); });
  it('opens GM broadcasts directly and never exposes that shortcut to players', async () => { expect(shell(false).some(n => n.props.children === 'Broadcast')).toBe(false); await click(shell(true).find(n => n.props.children === 'Broadcast')!); const content = shell(true).find(n => n.type === Notifications)!; expect(content.props.compose).toBe(true); expect(content.props.isGm).toBe(true); });
  it('shows timer controls only to the GM and leaves future features unavailable', async () => { const tree = shell(false); expect(tree.filter(n => n.type === 'button' && n.props.disabled === true)).toHaveLength(3); await click(tree.find(n => n.props.className && n.props['aria-haspopup'] === 'dialog' && n.props.children instanceof Array)!); expect(shell(false).some(n => n.type === TimerControls)).toBe(false); });
  it('shows an isolated HUD error without removing the sheet', () => { shared.error = 'Setup needs migration 022.'; const tree = shell(true); expect(tree.some(n => n.props.role === 'status')).toBe(true); expect(tree[0].props.children).toContain('Existing sheet'); });
  it('does not put GM composition controls in a player notification drawer', () => { shared.cursor = 0; const tree = nodes(Notifications({ campaignId: I.game, floor: 3, snapshot, isGm: false, crawlers: [], refresh: shared.refresh, onPending: vi.fn() })); expect(tree.some(n => n.type === BroadcastForm)).toBe(false); });
});
describe('floor timer editing', () => {
  it('keeps the opening version when a remote timer update arrives during editing', async () => {
    function render(version: string) { shared.cursor = 0; return nodes(TimerControls({ campaignId: I.game, floor: 3, timer: { ...timer, version }, onSaved: shared.refresh })); }
    render(I.version); const tree = render(I.other);
    await click(tree.find(n => n.props.children === 'Resume timer')!);
    expect(shared.save).toHaveBeenCalledWith(I.game, { operation: 'timer-resume', floor: 3, version: I.version });
  });
  it('keeps failed saves editable and reports the error', async () => {
    shared.save.mockResolvedValue({ error: 'Timer changed. Reopen controls.' });
    function render() { shared.cursor = 0; return nodes(TimerControls({ campaignId: I.game, floor: 3, timer, onSaved: shared.refresh })); }
    await click(render().find(n => n.props.children === 'Clear timer')!);
    expect(render().find(n => n.props.role === 'alert')?.props.children).toBe('Timer changed. Reopen controls.'); expect(shared.refresh).not.toHaveBeenCalled();
  });
});
