import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThirdFloorManager, type ThirdFloorManagerProps } from './third-floor-manager';
import { INITIAL_THIRD_FLOOR } from '@/domain/third-floor';
import { INITIAL_PROGRESSION } from '@/domain/progression';
import { seedAbilities } from '@/domain/abilities';
import { createTutorialProfile } from '@/domain/tutorial';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
const shared = vi.hoisted(() => ({ state: [] as unknown[], cursor: 0, save: vi.fn(), pending: false, error: null as string | null }));
vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()),
  useState(initial: unknown) { const i = shared.cursor++; if (!(i in shared.state)) shared.state[i] = initial; return [shared.state[i], (value: unknown) => { shared.state[i] = typeof value === 'function' ? (value as (old: unknown) => unknown)(shared.state[i]) : value; }]; },
  useRef(initial: unknown) { const i = shared.cursor++; if (!(i in shared.state)) shared.state[i] = { current: initial }; return shared.state[i]; },
}));
vi.mock('@/app/campaign/third-floor-actions', () => ({ thirdFloorAction: vi.fn() }));
vi.mock('@/controllers/use-dialog-action', () => ({ useDialogAction: () => ({ save: (form: FormData, version: string) => shared.save(form.get('operation'), JSON.parse(String(form.get('payload'))), version), pending: shared.pending, error: shared.error, clearError: vi.fn() }) }));
type Node = { type: unknown; props: Record<string, unknown> };
function nodes(tree: unknown): Node[] { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== 'object' || !('props' in tree)) return []; const n = tree as Node; return [n, ...nodes(n.props.children)]; }
function render(props: ThirdFloorManagerProps) {
  shared.cursor = 0;
  let tree = ThirdFloorManager(props) as Node;
  // Resolve the compatibility boundary before inspecting the legacy controls.
  while (typeof tree.type === 'function') tree = (tree.type as (props: Record<string, unknown>) => Node)(tree.props);
  return nodes(tree);
}
function find(tree: Node[], type: unknown, key?: string, value?: unknown) { const result = tree.find(n => n.type === type && (!key || n.props[key] === value)); if (!result) throw new Error(`Missing ${String(type)} ${key} ${String(value)}`); return result; }
async function call(node: Node, key: string, event?: unknown) { await (node.props[key] as (event: unknown) => unknown)(event); }
const context = { campaignId: 'game', crawlerId: 'crawler', version: 'opening-version' };
const props: ThirdFloorManagerProps = { context, isGm: true, floor: 3, advancementReady: true, state: { ...INITIAL_THIRD_FLOOR, offers: ['human|blizzardmancer'] }, bases: { strength: 20, intelligence: 20, constitution: 20, dexterity: 20, charisma: 20 }, skills: seedAbilities(createTutorialProfile(tutorialDraftFixture())), defenseBase: 0, baseDefenses: {} };
const OriginalFormData = globalThis.FormData;
beforeEach(() => { shared.state = []; shared.cursor = 0; shared.pending = false; shared.error = null; shared.save.mockReset().mockResolvedValue(true); vi.stubGlobal('FormData', class extends OriginalFormData { constructor(form?: { fields?: Record<string,string> }) { super(); for (const [key,value] of Object.entries(form?.fields ?? {})) this.set(key,value); } }); });
afterEach(() => vi.unstubAllGlobals());
describe('Third Floor selection controls', () => {
  it('prepares a partial review without submitting any grant or Human Favor mutation', async () => {
    const partial = { ...props, state: { ...INITIAL_THIRD_FLOOR, reviewed: false }, progression: INITIAL_PROGRESSION };
    await call(find(render(partial), 'button', 'children', 'Manage Race & Class'), 'onClick');
    await call(find(render(partial), 'form', 'aria-label', 'Prepare partial benefit reconciliation'), 'onSubmit', { preventDefault() {}, currentTarget: { fields: { reason: 'Partial grants already exist', confirmed: 'yes' } } });
    expect(shared.save).toHaveBeenCalledWith('partial-review', { reason: 'Partial grants already exist', confirmed: true }, 'opening-version');
  });
  it('shows a legacy benefit review only to the GM, and no offers before review', () => {
    const legacy = { ...props, state: { ...INITIAL_THIRD_FLOOR, reviewed: false } };
    expect(render(legacy).filter(n => n.type === 'form').map(n => n.props['aria-label'])).toEqual(['Review existing Race/Class benefits']);
    expect(render({ ...legacy, isGm: false }).filter(n => n.type === 'form')).toHaveLength(0);
  });
  it('shows players only their offered selection and locks selection on Tutorial Floors', () => {
    expect(render({ ...props, isGm: false }).filter(n => n.type === 'form').map(n => n.props['aria-label'])).toEqual(['Select Race and Class']);
    expect(render({ ...props, isGm: false, floor: 2 }).filter(n => n.type === 'form')).toHaveLength(0);
    expect(render({ ...props, advancementReady: false }).filter(n => n.type === 'form')).toHaveLength(0);
  });
  it('saves only the chosen pair/choices, pins the opening version and closes on success', async () => {
    await call(find(render(props), 'button', 'children', 'Manage Race & Class'), 'onClick');
    const refreshed = { ...props, context: { ...context, version: 'new-version' } };
    await call(find(render(refreshed), 'form', 'aria-label', 'Select Race and Class'), 'onSubmit', { preventDefault() {}, currentTarget: { fields: { reason: 'Choice', confirmed: 'yes' } } });
    expect(shared.save).toHaveBeenCalledWith('select', { pair: 'human|blizzardmancer', choices: {}, reason: 'Choice', confirmed: true }, 'opening-version');
    expect(render(refreshed).find(n => n.props.title === 'Third Floor Race & Class')?.props.open).toBe(false);
  });
  it('retains the dialog on failure and Close does not write', async () => {
    shared.save.mockResolvedValue(false);
    await call(find(render(props), 'button', 'children', 'Manage Race & Class'), 'onClick');
    await call(find(render(props), 'form', 'aria-label', 'Select Race and Class'), 'onSubmit', { preventDefault() {}, currentTarget: { fields: { reason: 'Choice', confirmed: 'yes' } } });
    expect(render(props).find(n => n.props.title === 'Third Floor Race & Class')?.props.open).toBe(true);
    shared.save.mockClear(); await call(find(render(props), 'button', 'children', 'Close'), 'onClick'); expect(shared.save).not.toHaveBeenCalled();
  });
  it('requires all Fighter choices and disables a duplicate support choice', async () => {
    const fighter = { ...props, state: { ...INITIAL_THIRD_FLOOR, offers: ['human|fighter'] } };
    expect(find(render(fighter), 'button', 'children', 'Confirm selection and apply benefits once').props.disabled).toBe(true);
    async function choose(name: string, index: number, value: string) { const node = render(fighter).find(n => n.type === 'select' && n.props.name === name && n.props['data-index'] === index)!; await call(node, 'onChange', { target: { name, value, dataset: { index: String(index) } } }); }
    await choose('weapon', 0, 'bow'); await choose('support', 0, 'aiming'); await choose('support', 1, 'aiming');
    expect(find(render(fighter), 'button', 'children', 'Confirm selection and apply benefits once').props.disabled).toBe(true);
    await choose('support', 1, 'catcher');
    expect(find(render(fighter), 'button', 'children', 'Confirm selection and apply benefits once').props.disabled).toBe(false);
  });
  it('records reviewed manual identity instead of offering to grant it again', async () => {
    const legacy = { ...props, state: { ...INITIAL_THIRD_FLOOR, reviewed: false } };
    await call(find(render(legacy), 'select', 'name', 'mode'), 'onChange', { target: { value: 'existing' } });
    await call(find(render(legacy), 'select', 'name', 'raceId'), 'onChange', { target: { value: 'manual' } });
    await call(find(render(legacy), 'select', 'name', 'classId'), 'onChange', { target: { value: 'manual' } });
    await call(find(render(legacy), 'form'), 'onSubmit', { preventDefault() {}, currentTarget: { fields: { raceName: 'Existing Race', className: 'Existing Class', size: '3', move: '30', step: '15', reason: 'Previously granted', confirmed: 'yes' } } });
    expect(shared.save).toHaveBeenCalledWith('review', { mode: 'existing', raceId: 'manual', classId: 'manual', raceName: 'Existing Race', className: 'Existing Class', size: 3, move: 30, step: 15, reason: 'Previously granted', confirmed: true }, context.version);
  });
  it('shows saved identities read-only and has no second application form', () => {
    const selected = { raceId: 'human', classId: 'fighter', raceName: 'Human', className: 'Boring Ol’ Fighter', size: 4, move: 20, step: 10, mode: 'applied' as const, notes: 'Chosen' };
    expect(render({ ...props, state: { reviewed: true, offers: [], selected } }).filter(n => n.type === 'form')).toHaveLength(0);
  });
});
