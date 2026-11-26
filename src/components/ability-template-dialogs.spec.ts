import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
import {AbilityDefinitionEditor} from './ability-definition-editor';
import {EffectTemplateManager} from './effect-template-manager';
import {EffectTemplateLink} from './effect-template-link';
import type {LearnedAbility} from '@/domain/abilities';
import type {EffectTemplate} from '@/domain/effect-templates';
const shared=vi.hoisted(()=>({state:[] as unknown[],cursor:0,save:vi.fn(),pending:false,error:null as string|null}));
vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()),useState(initial:unknown){const i=shared.cursor++;if(!(i in shared.state))shared.state[i]=initial;return[shared.state[i],(v:unknown)=>{shared.state[i]=v;}];},useRef(initial:unknown){const i=shared.cursor++;if(!(i in shared.state))shared.state[i]={current:initial};return shared.state[i];},useEffect(){},useId(){return 'dialog';}}));
vi.mock('@/controllers/use-dialog-action',()=>({useDialogAction:()=>({save:shared.save,pending:shared.pending,error:shared.error,clearError:vi.fn()})}));
vi.mock('@/app/campaign/skill-actions',()=>({skillAction:vi.fn()}));
vi.mock('@/app/campaign/template-actions',()=>({templateAction:vi.fn()}));
const context={campaignId:'game',crawlerId:'crawler',version:'opening-version'};
const ability:LearnedAbility={id:'spell',name:'Might',kind:'spell',rank:1,maxRank:15,stat:'intelligence',passive:false,advancement:'normal',marked:false,manaCost:2,description:'',reference:'',damage:'',range:'',automation:'manual',origin:'gm'};
const template:EffectTemplate={id:'template',campaignId:'game',version:'template-opening',repeatPolicy:'refresh',definition:{name:'Might',kind:'buff',source:'',notes:'',remainingRounds:2,modifiers:{strength:2,intelligence:0,constitution:0,dexterity:0,charisma:0},defenses:{}}};
type Node={type:unknown;props:Record<string,unknown>};
function nodes(tree:unknown):Node[]{if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object'||!('props'in tree))return[];const n=tree as Node;return[n,...nodes(n.props.children)];}
function render(kind:'ability'|'manager'|'link',version=context.version,templates:readonly EffectTemplate[]=[template]){shared.cursor=0;return nodes(kind==='ability'?AbilityDefinitionEditor({context:{...context,version},ability}):kind==='manager'?EffectTemplateManager({campaignId:context.campaignId,templates}):EffectTemplateLink({context:{...context,version},kind:'spell',target:'spell',templates,linkedId:template.id}));}
function find(tree:Node[],type:unknown,prop?:string,value?:unknown){const node=tree.find(n=>n.type===type&&(!prop||n.props[prop]===value));if(!node)throw new Error(`Missing ${String(type)} ${prop}`);return node;}
async function call(node:Node,handler:string,event?:unknown){return await(node.props[handler]as(event?:unknown)=>unknown)(event);}
async function open(kind:'ability'|'manager'|'link'){await call(find(render(kind),'button'),'onClick');}
function submit(fields:Record<string,string>={},remove=false){return{preventDefault(){},currentTarget:{fields},nativeEvent:{submitter:{getAttribute:()=>remove?'remove':'save'}}};}
const OriginalFormData=globalThis.FormData;
beforeEach(()=>{shared.state=[];shared.cursor=0;shared.pending=false;shared.error=null;shared.save.mockReset().mockResolvedValue(true);vi.stubGlobal('FormData',class extends OriginalFormData{constructor(form?:{fields?:Record<string,string>}){super();for(const[k,v]of Object.entries(form?.fields??{}))this.set(k,v);}});});
afterEach(()=>vi.unstubAllGlobals());
describe('ability correction and effect-template dialogs',()=>{
 it('saves GM correction using the opening version, then closes',async()=>{await open('ability');await call(find(render('ability','newer'),'form'),'onSubmit',submit({name:'Corrected',rank:'4'}));const[f,v]=shared.save.mock.calls[0];expect(f.get('operation')).toBe('edit');expect(f.get('skillId')).toBe('spell');expect(v).toBe('opening-version');expect(render('ability').find(n=>n.props.title)?.props.open).toBe(false);});
 it.each(['ability','link','manager'] as const)('cancels %s without persisting',async kind=>{await open(kind);await call(find(render(kind),'button','children','Cancel'),'onClick');expect(shared.save).not.toHaveBeenCalled();expect(render(kind).find(n=>n.props.title)?.props.open).toBe(false);});
 it.each(['ability','link','manager'] as const)('retains %s draft after failure and blocks close while pending',async kind=>{await open(kind);shared.save.mockResolvedValue(false);await call(find(render(kind),'form'),'onSubmit',submit({name:'Draft'}));shared.error='Conflict';shared.pending=true;await call(find(render(kind),'button','children','Cancel'),'onClick');const tree=render(kind);expect(tree.find(n=>n.props.title)?.props.open).toBe(true);expect(find(tree,'fieldset').props.disabled).toBe(true);expect(find(tree,'p','role','alert').props.children).toBe('Conflict');});
 it('does not offer protected Tutorial Heal definition editing',()=>{shared.cursor=0;expect(AbilityDefinitionEditor({context,ability:{...ability,automation:'tutorial-heal'}})).toBe(null);});
 it('links using opening crawler version, including explicit unlink',async()=>{await open('link');await call(find(render('link','newer'),'form'),'onSubmit',submit({templateId:''}));const[f,v]=shared.save.mock.calls[0];expect(f.get('operation')).toBe('link');expect(f.get('kind')).toBe('spell');expect(f.get('target')).toBe('spell');expect(f.get('templateId')).toBe('');expect(v).toBe('opening-version');});
 it('edits using the selected template snapshot version',async()=>{await open('manager');await call(find(render('manager'),'select'),'onChange',{currentTarget:{value:'template'}});await call(find(render('manager',context.version,[{...template,version:'newer'}]),'form'),'onSubmit',submit({name:'Changed'}));const[f]=shared.save.mock.calls[0];expect(f.get('operation')).toBe('edit');expect(f.get('templateId')).toBe('template');expect(f.get('templateVersion')).toBe('template-opening');});
 it('deletes using a separate submit command and confirmation field',async()=>{await open('manager');await call(find(render('manager'),'select'),'onChange',{currentTarget:{value:'template'}});await call(find(render('manager'),'form'),'onSubmit',submit({confirmed:'yes'},true));const[f]=shared.save.mock.calls[0];expect(f.get('operation')).toBe('remove');expect(f.get('confirmed')).toBe('yes');});
 it('saves a new template with add and without an existing template identity',async()=>{await open('manager');await call(find(render('manager'),'form'),'onSubmit',submit({name:'New',policy:'refresh'}));const[f]=shared.save.mock.calls[0];expect(f.get('operation')).toBe('add');expect(f.get('templateId')).toBe(null);});

});
