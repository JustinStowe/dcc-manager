import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AdvancementManager, type AdvancementManagerProps } from './advancement-manager';
import { INITIAL_ADVANCEMENT } from '@/domain/advancement';
import { createTutorialProfile } from '@/domain/tutorial';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
const shared = vi.hoisted(() => ({ state: [] as unknown[], cursor: 0, save: vi.fn(), error: null as string | null }));
vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()),
  useState(initial: unknown) { const i = shared.cursor++; if (!(i in shared.state)) shared.state[i] = initial; return [shared.state[i], (value: unknown) => { shared.state[i] = typeof value === 'function' ? (value as (previous: unknown) => unknown)(shared.state[i]) : value; }]; },
  useRef(initial: unknown) { const i = shared.cursor++; if (!(i in shared.state)) shared.state[i] = { current: initial }; return shared.state[i]; },
}));
vi.mock('@/app/campaign/advancement-actions', () => ({ advancementAction: vi.fn() }));
vi.mock('@/controllers/use-dialog-action', () => ({ useDialogAction: () => ({ save: (form: FormData, version: string) => shared.save(form.get('operation'), JSON.parse(String(form.get('payload'))), version), pending: false, error: shared.error, clearError: vi.fn() }) }));
type Node = { type: unknown; props: Record<string, unknown> };
function nodes(tree: unknown): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object' || !('props' in tree)) return [];
  const node = tree as Node; return [node, ...nodes(node.props.children)];
}
function render(props: AdvancementManagerProps) { shared.cursor = 0; return nodes(AdvancementManager(props)); }
function find(tree: Node[], type: unknown, key?: string, value?: unknown) {
  const node = tree.find(n => n.type === type && (!key || n.props[key] === value)); if (!node) throw new Error(`Missing ${String(type)} ${key} ${String(value)}`); return node;
}
async function call(node: Node, key: string, event?: unknown) { await (node.props[key] as (e: unknown) => unknown)(event); }
const context = { campaignId: 'game', crawlerId: 'crawler', version: 'opening-version' };
const props: AdvancementManagerProps = { context, level: 9, floor: 3, isGm: true, state: { ...INITIAL_ADVANCEMENT, spent: 12, authorized: 6 }, stats: createTutorialProfile(tutorialDraftFixture()).stats };
const OriginalFormData = globalThis.FormData;
beforeEach(() => {
  shared.state = []; shared.cursor = 0; shared.error = null; shared.save.mockReset().mockResolvedValue(true);
  vi.stubGlobal('FormData', class extends OriginalFormData { constructor(form?: { fields?: Record<string,string> }) { super(); for (const [k,v] of Object.entries(form?.fields ?? {})) this.set(k,v); } });
});
afterEach(() => vi.unstubAllGlobals());
describe('advancement controls', () => {
  it('shows GM reconciliation only for legacy crawlers and no spending form', () => {
    const legacy = { ...props, state: { ...INITIAL_ADVANCEMENT, reconciled: false } };
    expect(find(render(legacy), 'form', 'aria-label', 'Reconcile advancement')).toBeDefined();
    expect(render(legacy).filter(n => n.type === 'form' && n.props['aria-label'] === 'Allocate stat points')).toHaveLength(0);
    expect(render({ ...legacy, isGm: false }).filter(n => n.type === 'form')).toHaveLength(0);
  });
  it('shows only allocation to an eligible player and banks points on Tutorial Floors', () => {
    const player = { ...props, isGm: false };
    expect(render(player).filter(n => n.type === 'form').map(n => n.props['aria-label'])).toEqual(['Allocate stat points']);
    expect(render({ ...player, floor: 2 }).filter(n => n.type === 'form')).toHaveLength(0);
    expect(render({ ...player, state: INITIAL_ADVANCEMENT }).filter(n => n.type === 'form')).toHaveLength(0);
  });
  it('sends delta allocations and keeps the opening version if props refresh', async () => {
    await call(find(render(props), 'button', 'children', 'Manage advancement'), 'onClick');
    const refreshed = { ...props, context: { ...context, version: 'new-version' } };
    await call(find(render(refreshed), 'form', 'aria-label', 'Allocate stat points'), 'onSubmit', { preventDefault() {}, currentTarget: { fields: { strength: '2', intelligence: '1', constitution: '0', dexterity: '0', charisma: '0' } } });
    expect(shared.save).toHaveBeenCalledWith('allocate', { allocation: { strength: 2, intelligence: 1, constitution: 0, dexterity: 0, charisma: 0 } }, 'opening-version');
    expect(render(refreshed).find(n => n.props.title === 'Level advancement')?.props.open).toBe(false);
  });
  it('retains the dialog and draft after rejection; Close never saves', async () => {
    shared.save.mockResolvedValue(false);
    await call(find(render(props), 'button', 'children', 'Manage advancement'), 'onClick');
    await call(find(render(props), 'input', 'name', 'strength'), 'onChange', { target: { name: 'strength', value: '2' } });
    await call(find(render(props), 'form', 'aria-label', 'Allocate stat points'), 'onSubmit', { preventDefault() {}, currentTarget: { fields: { strength: '2', intelligence: '0', constitution: '0', dexterity: '0', charisma: '0' } } });
    expect(render(props).find(n => n.props.title === 'Level advancement')?.props.open).toBe(true);
    expect(find(render(props), 'input', 'name', 'strength').props.value).toBe('2');
    shared.save.mockClear(); await call(find(render(props), 'button', 'children', 'Close'), 'onClick'); expect(shared.save).not.toHaveBeenCalled();
  });
  it('disables empty and overspent allocations and disables awards at cap', async () => {
    expect(find(render(props), 'button', 'children', 'Apply stat points').props.disabled).toBe(true);
    await call(find(render(props), 'input', 'name', 'strength'), 'onChange', { target: { name: 'strength', value: '7' } });
    expect(find(render(props), 'button', 'children', 'Apply stat points').props.disabled).toBe(true);
    await call(find(render(props), 'input', 'name', 'strength'), 'onChange', { target: { name: 'strength', value: '3' } });
    expect(find(render(props), 'button', 'children', 'Apply stat points').props.disabled).toBe(false);
    const capForm = find(render({ ...props, level: 250 }), 'form', 'aria-label', 'Award levels');
    expect(nodes(capForm).find(n => n.type === 'fieldset')?.props.disabled).toBe(true);
  });
  it('requires explicit confirmation and carries reviewed level, spending and notes', async () => {
    const legacy = { ...props, state: { ...INITIAL_ADVANCEMENT, reconciled: false } };
    await call(find(render(legacy), 'form', 'aria-label', 'Reconcile advancement'), 'onSubmit', { preventDefault() {}, currentTarget: { fields: { level: '9', spent: '12', confirmed: 'yes', reason: 'Reviewed existing gains' } } });
    expect(shared.save).toHaveBeenCalledWith('reconcile', { level: 9, spent: 12, confirmed: true, reason: 'Reviewed existing gains' }, context.version);
  });
});
