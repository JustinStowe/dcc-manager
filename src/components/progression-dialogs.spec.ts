import { beforeEach,afterEach,describe,expect,it,vi } from 'vitest';
import { ProgressionManager } from './progression-manager';
import { SystemAiPanel } from './system-ai-panel';
import { INITIAL_PROGRESSION } from '@/domain/progression';
import { progressionFixture,PG_IDS as I } from '@/test/progression-fixture';
const shared=vi.hoisted(()=>({state:[]as unknown[],cursor:0,save:vi.fn(),pending:false,error:null as string|null}));
vi.mock('react',()=>({useState(initial:unknown){const i=shared.cursor++;if(!(i in shared.state))shared.state[i]=initial;return[shared.state[i],(v:unknown)=>{shared.state[i]=typeof v==='function'?(v as (old:unknown)=>unknown)(shared.state[i]):v;}];},useRef(initial:unknown){const i=shared.cursor++;if(!(i in shared.state))shared.state[i]={current:initial};return shared.state[i];},useEffect(){}}));
vi.mock('@/controllers/use-dialog-action',()=>({useDialogAction:()=>({save:shared.save,pending:shared.pending,error:shared.error,clearError:vi.fn()})}));
vi.mock('@/app/campaign/progression-actions',()=>({progressionAction:vi.fn()}));
type Node={type:unknown;props:Record<string,unknown>};
function nodes(tree:unknown):Node[]{if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object'||!('props'in tree))return[];const n=tree as Node;return[n,...nodes(n.props.children)];}
function find(tree:Node[],type:unknown,key?:string,value?:unknown){const n=tree.find(n=>n.type===type&&(!key||n.props[key]===value));if(!n)throw new Error(`Missing ${String(type)} ${key}`);return n;}
async function call(n:Node,name:string,event?:unknown){return await(n.props[name]as(e?:unknown)=>unknown)(event);}
function render(gm=true,version=I.version){shared.cursor=0;const w=progressionFixture(),l=w.loadouts![I.crawler],p={...INITIAL_PROGRESSION,offers:[{id:'offer',raceId:'human',classId:'blizzardmancer',waivers:[],reason:'Reviewed'}]};return nodes(ProgressionManager({context:{campaignId:I.game,crawlerId:I.crawler,version},state:w.sheets![I.crawler].thirdFloor,progression:p,floor:3,isGm:gm,advancementReady:true,bases:Object.fromEntries(Object.entries(l.baseline).map(([k,v])=>[k,v.base]))as never,skills:w.skills![I.crawler],defenseBase:0,baseDefenses:{}}));}
const BaseFormData=globalThis.FormData;
beforeEach(()=>{shared.state=[];shared.cursor=0;shared.pending=false;shared.error=null;shared.save.mockReset().mockResolvedValue(true);vi.stubGlobal('FormData',class extends BaseFormData{constructor(form?:{fields?:Record<string,string>}){super();for(const[k,v]of Object.entries(form?.fields??{}))this.set(k,v);}});});
afterEach(()=>vi.unstubAllGlobals());
const event=()=>({preventDefault(){},currentTarget:{fields:{reason:'Reviewed',confirmed:'yes'}}});
describe('progression dialog state and permissions',()=>{
 it('saves selection with the opening crawler version',async()=>{await call(find(render(false),'button','children','Manage Race & Class'),'onClick');const form=render(false,I.other).filter(n=>n.type==='form').find(n=>nodes(n.props.children).some(n=>n.type==='legend'&&n.props.children==='3 · Select and review actual changes'))!;await call(form,'onSubmit',event());const[f,v]=shared.save.mock.calls[0];expect(v).toBe(I.version);expect(JSON.parse(f.get('payload'))).toMatchObject({offerId:'offer',choices:{},skip:[]});});
 it('keeps a failed draft open and disables actions while saving',async()=>{await call(find(render(),'button','children','Manage Race & Class'),'onClick');shared.save.mockResolvedValue(false);const tree=render(),form=tree.find(n=>n.type==='form')!;await call(form,'onSubmit',event());shared.pending=true;shared.error='Crawler changed';await call(find(render(),'button','children','Close'),'onClick');expect(render().find(n=>n.props.title)?.props.open).toBe(true);expect(render().some(n=>n.type==='fieldset'&&n.props.disabled===true)).toBe(true);expect(find(render(),'p','role','alert').props.children).toBe('Crawler changed');});
 it('does not render GM evidence, reward or menu forms for an owner',()=>{const legends=render(false).filter(n=>n.type==='legend').map(n=>n.props.children);expect(legends).not.toContain('GM menu · at most three pairs');expect(render(false).filter(n=>n.type==='input'&&n.props.name==='popularity')).toHaveLength(0);});
 it('cancels without a write',async()=>{await call(find(render(),'button','children','Manage Race & Class'),'onClick');await call(find(render(),'button','children','Close'),'onClick');expect(shared.save).not.toHaveBeenCalled();expect(render().find(n=>n.props.title)?.props.open).toBe(false);});
});
describe('System AI rate-limit UI',()=>{
 it('preserves input after 429 and disables immediate retries',async()=>{const onBuild=vi.fn(),onSuggestions=vi.fn();vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,json:async()=>({error:'Please wait.',retryAfter:42})}));function panel(){shared.cursor=0;return nodes(SystemAiPanel({context:{campaignId:I.game,crawlerId:I.crawler,version:I.version},raceId:'human',onBuild,onSuggestions}));}await call(find(panel(),'form'),'onSubmit',{preventDefault(){},currentTarget:{fields:{purpose:'class-suggestions',kind:'class',earth:'yes',theme:'My existing draft'}}});expect(find(panel(),'p','role','alert').props.children).toBe('Please wait.');expect(find(panel(),'fieldset').props.disabled).toBe(true);expect(onBuild).not.toHaveBeenCalled();expect(onSuggestions).not.toHaveBeenCalled();});
});
