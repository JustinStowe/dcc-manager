import {describe,expect,it,vi} from 'vitest';
import {AbilitiesView} from '@/views/abilities-view';
import {AbilityTable,type AbilityTableRow} from './ability-table';
import {AbilityDefinitionEditor} from './ability-definition-editor';
import {CampaignForm} from './campaign-form';
import {createTutorialProfile} from '@/domain/tutorial';
import {seedAbilities} from '@/domain/abilities';
import {tutorialDraftFixture} from '@/test/tutorial-fixture';
vi.mock('@/components/ability-definition-editor',()=>({AbilityDefinitionEditor:()=>null}));
vi.mock('@/views/linked-effect-view',()=>({LinkedEffectView:()=>null}));
vi.mock('@/components/campaign-form',()=>({CampaignForm:()=>null}));
vi.mock('@/app/campaign/skill-actions',()=>({skillAction:vi.fn()}));
type Node={type:unknown;props:Record<string,unknown>};
function nodes(tree:unknown):Node[]{if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object'||!('props'in tree))return[];const n=tree as Node;return[n,...nodes(n.props.children)];}
const profile=createTutorialProfile(tutorialDraftFixture());const abilities=seedAbilities(profile);
function render(isGm=false){return nodes(AbilitiesView({campaignId:'game',crawlerId:'crawler',version:'version',abilities,profile,isGm,healthSlots:10}));}
function rows(isGm=false){return render(isGm).find(n=>n.type===AbilityTable)?.props.rows as readonly AbilityTableRow[];}
describe('unified skills and spells',()=>{
 it('has a single list with per-row management including the Spell cast controls',()=>{expect(render().filter(n=>n.type===AbilityTable)).toHaveLength(1);expect(rows().length).toBe(abilities.length);const heal=rows().find(r=>r.id==='heal')!;expect(nodes(heal.management).filter(n=>n.type===CampaignForm&&n.props.label==='Cast Heal')).toHaveLength(1);expect(JSON.stringify(render())).not.toContain('Mark, inspect & manage abilities');});
 it('exposes definition correction only for GM-managed, unprotected definitions',()=>{expect(rows().flatMap(r=>nodes(r.management)).filter(n=>n.type===AbilityDefinitionEditor)).toHaveLength(0);expect(rows(true).flatMap(r=>nodes(r.management)).filter(n=>n.type===AbilityDefinitionEditor)).toHaveLength(abilities.length-1);expect(nodes(rows(true).find(r=>r.id==='heal')!.management).filter(n=>n.type===AbilityDefinitionEditor)).toHaveLength(0);});
 it('retains eligible advancement controls for players directly under the selected row',()=>{const markedAbility=abilities.find(a=>a.advancement==='normal'&&a.rank<15)!;expect(nodes(rows().find(r=>r.id===markedAbility.id)!.management).filter(n=>n.type===CampaignForm&&String(n.props.label).startsWith('Mark '))).toHaveLength(1);});
});
