import {describe,expect,it,vi} from 'vitest';
import {TrackedEffectsView} from '@/views/tracked-effects-view';
import {EffectsManager} from './effects-manager';
import type {TrackedEffect} from '@/domain/tracked-effects';
vi.mock('@/components/effects-manager',()=>({EffectsManager:()=>null}));
const context={campaignId:'game',crawlerId:'crawler',version:'version'};
const effect:TrackedEffect={id:'one',name:'Active buff',kind:'buff',source:'Spell',notes:'Visible to player',active:true,remainingRounds:1,modifiers:{strength:2,intelligence:0,constitution:0,dexterity:0,charisma:0},defenses:{Fire:{resistant:true,vulnerable:false,immune:false}}};
type Node={type:unknown;props:Record<string,unknown>};
function nodes(tree:unknown):Node[]{if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object'||!('props'in tree))return[];const n=tree as Node;return[n,...nodes(n.props.children)];}
function text(tree:unknown):string{if(Array.isArray(tree))return tree.map(text).join('');if(tree&&typeof tree==='object'&&'props'in tree)return text((tree as Node).props.children);return typeof tree==='string'||typeof tree==='number'?String(tree):'';}
describe('read-only active effects',()=>{
 it('shows active names, source, notes, duration and contributions',()=>{const tree=TrackedEffectsView({context,isGm:false,effects:[effect]});expect(text(tree)).toContain('Active buff');expect(text(tree)).toContain('Visible to player');expect(text(tree)).toContain('Spell');expect(text(tree)).toContain('1 rounds remaining');expect(text(tree)).toContain('strength +2');expect(text(tree)).toContain('Fire: resistant');});
 it.each([false,true])('keeps the displayed list informational for role GM=%s',isGm=>{const tree=TrackedEffectsView({context,isGm,effects:[effect]});expect(nodes(tree).filter(n=>['form','input','select','textarea'].includes(n.type as string))).toHaveLength(0);});
 it('exposes one manager to GM only, with inactive records available inside it',()=>{const effects=[effect,{...effect,id:'expired',name:'Expired source',active:false,remainingRounds:0}];const gm=TrackedEffectsView({context,isGm:true,effects});expect(nodes(gm).filter(n=>n.type===EffectsManager)).toHaveLength(1);expect(nodes(gm).find(n=>n.type===EffectsManager)?.props.effects).toBe(effects);expect(text(gm)).not.toContain('Expired source');expect(nodes(TrackedEffectsView({context,isGm:false,effects})).filter(n=>n.type===EffectsManager)).toHaveLength(0);});
 it('keeps GM editing available when there are no active effects',()=>{const tree=TrackedEffectsView({context,isGm:true,effects:[]});expect(text(tree)).toContain('No active effects');expect(nodes(tree).filter(n=>n.type===EffectsManager)).toHaveLength(1);});
});
