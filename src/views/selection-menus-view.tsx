import type { CampaignWorkspace } from '@/services/campaign-workspace';
import { isSelectionFloor, pendingSelectionMenu, restoreSelectionMenus } from '@/domain/selection-menus';
import { STAT_KEYS, type Scores } from '@/domain/tutorial';
import { MenuPushControls, SpecializationChooser, SpecializationEditor } from '@/components/selection-menu-controls';
import { ThirdFloorManager } from '@/components/third-floor-manager';
import styles from '@/styles/campaign.module.css';
export function SelectionMenusView({workspace,crawlerId,isGm}:{workspace:CampaignWorkspace;crawlerId?:string;isGm:boolean}){
 const campaign=workspace.campaign;if(!campaign)return null;
 const entry=campaign.crawlers.find(e=>e.crawler.id===crawlerId),sheet=crawlerId?workspace.sheets?.[crawlerId]:undefined,loadout=crawlerId?workspace.loadouts?.[crawlerId]:undefined;
 const state=restoreSelectionMenus(sheet?.selectionMenus),pending=pendingSelectionMenu(state,sheet?.floor??0);
 const visible=!!(entry&&sheet&&loadout&&isSelectionFloor(sheet.floor)&&(isGm||pending));
 if(!isGm&&!visible)return null;
 const context={campaignId:campaign.id,crawlerId:crawlerId??'',version:workspace.versions[crawlerId??'']??''};
 const content=<>
  {isGm&&<MenuPushControls campaignId={campaign.id} roster={campaign.crawlers.map(({crawler})=>{const s=workspace.sheets?.[crawler.id],d=pendingSelectionMenu(s?.selectionMenus,s?.floor??0);return{name:crawler.name,floor:s?.floor??1,status:d?'menu sent':!s?.advancement?.reconciled?'advancement review needed':!s.thirdFloor?.reviewed?'existing benefit review needed':s.floor>3&&isSelectionFloor(s.floor)?'prepare or review specialization choices':s.thirdFloor?.selected?'Class recorded':'ready for Race/Class menu'};})}/>}
  {visible&&entry&&sheet&&loadout&&<>
   {sheet.floor===3||isGm&&!sheet.thirdFloor?.reviewed?<><h3>{entry.crawler.name} · {isGm?'Race & Class review / menu preparation':'The GM sent your Race & Class menu'}</h3>{!isGm&&<p>Review the recommendations, check the benefits and confirm an eligible choice from the menu your GM authorized.</p>}<ThirdFloorManager key={pending?.id??entry.crawler.id} context={context} crawlerName={entry.crawler.name} level={sheet.level} state={sheet.thirdFloor} progression={sheet.progression} advancement={sheet.advancement} floor={sheet.floor} isGm={isGm} initiallyOpen={!isGm&&!!pending} catalogAllowed={pending?.catalog===true} advancementReady={sheet.advancement?.reconciled===true} bases={Object.fromEntries(STAT_KEYS.map(k=>[k,loadout.baseline[k].base]))as Scores} skills={workspace.skills?.[entry.crawler.id]??[]} defenseBase={loadout.defenseBase} baseDefenses={sheet.baseDefenses??{}}/></>:null}
   {sheet.floor>3&&sheet.thirdFloor?.selected&&<>
    {isGm&&<SpecializationEditor key={context.version} context={context} floor={sheet.floor} delivery={state.deliveries.find(d=>d.floor===sheet.floor)} crawlerName={entry.crawler.name}/>}
    {pending&&<SpecializationChooser key={pending.id} context={context} delivery={pending} crawlerName={entry.crawler.name} initiallyOpen={!isGm}/>}
   </>}
  </>}
 </>;
 return isGm?<details className={styles.panel}><summary>Player selection menus · GM desk</summary>{content}</details>:<section className={styles.panel} aria-label="Pushed selection menu">{content}</section>;
}
