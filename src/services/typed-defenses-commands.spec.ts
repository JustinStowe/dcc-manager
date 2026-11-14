import { describe,expect,it } from 'vitest';
import { addCampaignPlayer,createCampaign } from '@/domain';
import { createCrawler } from '@/domain/crawler';
import { createTutorialProfile } from '@/domain/tutorial';
import { seedAbilities } from '@/domain/abilities';
import type { Hotlist } from '@/domain/loadout';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
import type { CampaignWorkspace } from './campaign-workspace';
import { executeSheetCommand,type SheetWrite } from './sheet-commands';
const GM='11111111-1111-1111-1111-111111111111', PLAYER='22222222-2222-2222-2222-222222222222', OTHER='33333333-3333-3333-3333-333333333333';
const GAME='77777777-7777-7777-7777-777777777777', ID='55555555-5555-5555-5555-555555555555', ITEM='66666666-6666-4666-8666-666666666666', VERSION='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
function fixture(userId=PLAYER, health=10): CampaignWorkspace {
  let campaign=addCampaignPlayer(createCampaign({id:GAME,name:'Game',gmUserId:GM}),GM,PLAYER);campaign=addCampaignPlayer(campaign,GM,OTHER);
  const profile={...createTutorialProfile(tutorialDraftFixture()),mana:2};
  const crawler={...createCrawler({id:ID,campaignId:GAME,name:'Carl',baseSegments:10,constitution:3,ruleset:'tutorial-v1'}),currentSegments:health};
  const hotlist:Hotlist=[{kind:'item',target:ITEM},{kind:'skill',target:'heal'},...Array.from({length:8},()=>null)];
  return {userId,campaign:{...campaign,crawlers:[{ownerUserId:PLAYER,crawler}]},versions:{[ID]:VERSION},tutorials:{[ID]:{profile,number:500000}},sheets:{[ID]:{level:1,floor:1,effects:[]}},skills:{[ID]:seedAbilities(profile)},inventories:{[ID]:[{id:ITEM,name:'Hat',kind:'gear',quantity:1,notes:'',gearSlot:'head',location:'stored'}]},loadouts:{[ID]:{baseline:profile.stats,defenseBase:0,hotlist}}};
}
function form(changes:Record<string,string>={}) {const result=new FormData();for(const[k,v]of Object.entries({crawlerId:ID,version:VERSION,operation:'mana',payload:JSON.stringify({value:1}),...changes}))result.set(k,v);return result;}
function port(){const calls:SheetWrite[]=[];return{calls,adapter:{async act(v:SheetWrite){calls.push(v);}}};}
describe('typed defense command permissions',()=>{
 it('allows GM review and sends only validated flags',async()=>{const p=port();await executeSheetCommand(fixture(GM),form({operation:'typed-defenses',payload:'{"defenses":{"Fire":{"resistant":true,"vulnerable":false,"immune":false}},"mana":999}'}),p.adapter);expect(p.calls[0].payload).toEqual({defenses:{Fire:{resistant:true,vulnerable:false,immune:false}}});});
 it.each([PLAYER,OTHER])('rejects player defense edits %s',async(user)=>{const p=port();await expect(executeSheetCommand(fixture(user),form({operation:'typed-defenses',payload:'{"defenses":{}}'}),p.adapter)).rejects.toThrow();expect(p.calls.length).toBe(0);});
 it('permits GM clearing all flags without touching resources',async()=>{const p=port();await executeSheetCommand(fixture(GM),form({operation:'typed-defenses',payload:'{"defenses":{}}'}),p.adapter);expect(p.calls[0].payload).toEqual({defenses:{}});});
 it('rejects stale GM definitions',async()=>{const p=port();await expect(executeSheetCommand(fixture(GM),form({operation:'typed-defenses',version:OTHER,payload:'{"defenses":{}}'}),p.adapter)).rejects.toThrow('changed');expect(p.calls.length).toBe(0);});
 it.each(['{"Laser":{"resistant":true,"vulnerable":false,"immune":false}}','{"Fire":{"resistant":"yes","vulnerable":false,"immune":false}}','[]','null'])('rejects unsupported flags %s',async(defenses)=>{const p=port();await expect(executeSheetCommand(fixture(GM),form({operation:'typed-defenses',payload:`{"defenses":${defenses}}`}),p.adapter)).rejects.toThrow();expect(p.calls.length).toBe(0);});
 it('keeps damage requests raw and ignores client-supplied immunity',async()=>{const p=port();await executeSheetCommand(fixture(),form({operation:'damage',payload:'{"parts":[{"type":"Fire","amount":13}],"defenses":{"Fire":{"resistant":false,"vulnerable":false,"immune":true}},"net":0}'}),p.adapter);expect(p.calls[0].payload).toEqual({parts:[{type:'Fire',amount:13}]});});
 it('does not claim success when the database rejects a defense save',async()=>{await expect(executeSheetCommand(fixture(GM),form({operation:'typed-defenses',payload:'{"defenses":{}}'}),{async act(){throw new Error('Concurrent update');}})).rejects.toThrow('Concurrent');});
});
