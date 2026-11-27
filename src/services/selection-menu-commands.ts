import { getCampaignRole } from '@/domain';
import { isSelectionFloor, pendingSelectionMenu, restoreSelectionMenus, specializationDraftSchema } from '@/domain/selection-menus';
import { requireUuid, type CampaignWorkspace } from './campaign-workspace';
import { progressionContext } from './progression-commands';
export interface SelectionMenuPort{act(campaignId:string,operation:string,payload:Record<string,unknown>):Promise<{pushed?:number;skipped?:number}>}
export async function executeSelectionMenuCommand(workspace:CampaignWorkspace,form:FormData,port:SelectionMenuPort){
 const campaign=workspace.campaign,role=campaign?getCampaignRole(campaign,workspace.userId):null;
 if(!campaign||!role||form.get('campaignId')!==campaign.id)throw new Error('Game access denied.');
 const operation=String(form.get('operation'));
 if(!['push','close','draft','choose'].includes(operation))throw new RangeError('Unknown selection menu action.');
 if(operation!=='choose'&&role!=='gm')throw new Error('Only the GM can prepare or push menus.');
 let payload:Record<string,unknown>;
 if(operation==='push'||operation==='close'){
  const floor=Number(form.get('floor'));if(!isSelectionFloor(floor))throw new RangeError('Choose Floor 3, 6, 9 or 12.');payload={floor};
 }else{
  const crawlerId=requireUuid(String(form.get('crawlerId'))),version=requireUuid(String(form.get('version'))),c=progressionContext(workspace,crawlerId,version);
  if(operation==='draft'){
   const floor=Number(form.get('floor'));if(!isSelectionFloor(floor)||floor===3||c.sheet.floor!==floor||!c.sheet.thirdFloor?.selected)throw new RangeError('Prepare specializations for a selected Class on its current milestone floor.');
   payload={crawlerId,version,floor,options:specializationDraftSchema.parse(JSON.parse(String(form.get('options'))))};
  }else{
   const delivery=pendingSelectionMenu(restoreSelectionMenus(c.sheet.selectionMenus),c.sheet.floor),deliveryId=requireUuid(String(form.get('deliveryId'))),choiceId=requireUuid(String(form.get('choiceId')));
   if(!delivery||delivery.floor===3||delivery.id!==deliveryId||!delivery.options.some(o=>o.id===choiceId)||form.get('confirmed')!=='yes')throw new RangeError('Choose a current pushed specialization and confirm its benefits.');
   payload={crawlerId,version,deliveryId,choiceId,confirmed:true};
  }
 }
 const result=await port.act(campaign.id,operation,payload);
 return operation==='push'?`Pushed ${result.pushed??0} menu(s); ${result.skipped??0} crawler(s) were not ready or already completed.`:operation==='choose'?'Specialization recorded. The GM applies its listed benefits using the existing sheet controls.':operation==='draft'?'Specialization choices saved. Push the menu when ready.':'Open menus withdrawn.';
}
