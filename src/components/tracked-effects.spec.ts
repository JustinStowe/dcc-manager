import {describe,expect,it,vi} from 'vitest';
import {TrackedEffectsView} from '@/views/tracked-effects-view';
import type {TrackedEffect} from '@/domain/tracked-effects';
vi.mock('@/components/campaign-form',()=>({CampaignForm:()=>null}));
vi.mock('@/app/campaign/effect-actions',()=>({effectAction:vi.fn()}));
const context={campaignId:'game',crawlerId:'crawler',version:'version'};
const effect:TrackedEffect={id:'one',name:'Active buff',kind:'buff',source:'Spell',notes:'Visible to player',active:true,remainingRounds:1,modifiers:{strength:2,intelligence:0,constitution:0,dexterity:0,charisma:0},defenses:{Fire:{resistant:true,vulnerable:false,immune:false}}};
type Node={type:unknown;props:Record<string,unknown>};
function nodes(tree:unknown):Node[]{if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object'||!('props'in tree))return[];const n=tree as Node;return[n,...nodes(n.props.children)];}
function text(tree:unknown):string{if(Array.isArray(tree))return tree.map(text).join('');if(tree&&typeof tree==='object'&&'props'in tree)return text((tree as Node).props.children);return typeof tree==='string'||typeof tree==='number'?String(tree):'';}
describe('tracked effect views',()=>{
 it('shows players active effects and notes without GM management',()=>{const tree=TrackedEffectsView({context,isGm:false,effects:[effect,{...effect,id:'two',name:'Hidden paused source',active:false}]});expect(text(tree)).toContain('Active buff');expect(text(tree)).toContain('Visible to player');expect(text(tree)).not.toContain('Hidden paused source');expect(nodes(tree).filter(n=>n.type==='button')).toHaveLength(0);});
 it('shows GM inactive/expired sources and countdown management',()=>{const tree=TrackedEffectsView({context,isGm:true,effects:[effect,{...effect,id:'expired',name:'Expired source',active:false,remainingRounds:0}]});expect(text(tree)).toContain('Expired source');expect(text(tree)).toContain('Expired');const buttons=nodes(tree).filter(n=>n.type==='button');expect(buttons.find(n=>n.props.children==='Advance one round for this crawler')?.props.disabled).toBe(false);expect(buttons.find(n=>n.props.children==='Activate')?.props.disabled).toBe(true);});
 it('disables round advance when only unlimited/paused effects remain',()=>{const tree=TrackedEffectsView({context,isGm:true,effects:[{...effect,remainingRounds:null},{...effect,id:'two',active:false}]});expect(nodes(tree).find(n=>n.type==='button'&&n.props.children==='Advance one round for this crawler')?.props.disabled).toBe(true);});
});
