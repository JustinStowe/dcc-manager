import{describe,expect,it}from'vitest';
import{SelectionMenusView}from'./selection-menus-view';
import{progressionFixture,PG_IDS as I}from'@/test/progression-fixture';
import{ThirdFloorManager}from'@/components/third-floor-manager';
type Node={type:unknown;props:Record<string,unknown>};
function nodes(tree:unknown):Node[]{if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object'||!('props'in tree))return[];const n=tree as Node;return[n,...nodes(n.props.children)];}
describe('pushed menu visibility',()=>{
 it('shows no permanent selection section to a player without a GM delivery',()=>{expect(SelectionMenusView({workspace:progressionFixture(I.player),crawlerId:I.crawler,isGm:false})).toBeNull();});
 it('opens the pushed Floor 3 terminal for its player',()=>{const w=progressionFixture(I.player),workspace={...w,sheets:{[I.crawler]:{...w.sheets![I.crawler],selectionMenus:{deliveries:[{id:I.other,floor:3 as const,status:'open'as const,options:[],choice:null,sentAt:'today',completedAt:null}]}}}};const manager=nodes(SelectionMenusView({workspace,crawlerId:I.crawler,isGm:false})).find(n=>n.type===ThirdFloorManager);expect(manager?.props.initiallyOpen).toBe(true);expect(manager?.props.context).toMatchObject({crawlerId:I.crawler});});
 it('does not expose a menu from another floor or a completed delivery',()=>{const w=progressionFixture(I.player);for(const status of ['closed','completed']as const){const workspace={...w,sheets:{[I.crawler]:{...w.sheets![I.crawler],selectionMenus:{deliveries:[{id:I.other,floor:3 as const,status,options:[],choice:null,sentAt:'today',completedAt:null}]}}}};expect(SelectionMenusView({workspace,crawlerId:I.crawler,isGm:false})).toBeNull();}});
});
