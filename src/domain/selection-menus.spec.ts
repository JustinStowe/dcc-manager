import {describe,expect,it}from'vitest';
import {isSelectionFloor,latestSpecialization,pendingSelectionMenu,restoreSelectionMenus,type SelectionDelivery}from'./selection-menus';
const id='11111111-1111-4111-8111-111111111111';
const delivery:SelectionDelivery={id,floor:6,status:'open',options:[{id,name:'Warden',benefits:'GM-reviewed benefits'}],choice:null,sentAt:'today',completedAt:null};
describe('selection milestones',()=>{
 it('only exposes open menus on the current milestone floor',()=>{const s={deliveries:[delivery]};expect(pendingSelectionMenu(s,6)).toEqual(delivery);for(const f of [1,3,5,7,9,12])expect(pendingSelectionMenu(s,f)).toBeUndefined();});
 it('recognizes only the four scheduled floors',()=>{expect([1,2,3,4,5,6,7,8,9,10,11,12].filter(isSelectionFloor)).toEqual([3,6,9,12]);});
 it('defaults existing crawlers to no deliveries and rejects duplicate milestones',()=>{expect(restoreSelectionMenus(undefined)).toEqual({deliveries:[]});expect(()=>restoreSelectionMenus({deliveries:[delivery,delivery]})).toThrow('Duplicate');});
 it('shows the latest completed specialization without replacing a base Class or earlier snapshots',()=>{const early={...delivery,status:'completed'as const,choice:delivery.options[0]},late={...early,floor:9 as const,choice:{...delivery.options[0],name:'Regent'}};expect(latestSpecialization({deliveries:[late,early]} )?.name).toBe('Regent');expect(early.choice.name).toBe('Warden');});
 it('ignores draft/withdrawn choices for the sheet identity',()=>{expect(latestSpecialization({deliveries:[{...delivery,status:'closed',choice:delivery.options[0]}]})).toBeUndefined();});
});
