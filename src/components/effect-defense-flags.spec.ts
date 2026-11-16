import {describe,expect,it} from 'vitest';
import {EffectDefenseFlags} from './effect-defense-flags';
type Node={type:unknown;props:Record<string,unknown>};
function nodes(tree:unknown):Node[]{if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object'||!('props'in tree))return[];const n=tree as Node;return[n,...nodes(n.props.children)];}
describe('effect defense matrix',()=>{
 it('renders exactly 13 damage rows and three aligned flag columns',()=>{const tree=nodes(EffectDefenseFlags({}));expect(tree.filter(n=>n.type==='table')).toHaveLength(1);expect(tree.filter(n=>n.type==='tr')).toHaveLength(14);expect(tree.filter(n=>n.type==='input')).toHaveLength(39);expect(tree.filter(n=>n.type==='th'&&n.props.scope==='col')).toHaveLength(4);});
 it('maps the existing form names to saved checkbox values and accessible labels',()=>{const tree=nodes(EffectDefenseFlags({defenses:{Fire:{resistant:true,vulnerable:false,immune:true}}}));expect(tree.find(n=>n.props.name==='Fire-resistant')?.props.defaultChecked).toBe(true);expect(tree.find(n=>n.props.name==='Fire-vulnerable')?.props.defaultChecked).toBe(false);expect(tree.find(n=>n.props.name==='Fire-immune')?.props.defaultChecked).toBe(true);expect(tree.find(n=>n.props.name==='Acid-resistant')?.props['aria-label']).toBe('Acid resistant');expect(tree.filter(n=>n.type==='input'&&String(n.props.name).startsWith('Armor Piercing'))).toHaveLength(0);});
});
