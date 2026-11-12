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
describe('sheet command boundary',()=>{
 it.each([PLAYER,GM])('permits bounded current Mana edits %s',async(user)=>{const p=port();await executeSheetCommand(fixture(user),form(),p.adapter);expect(p.calls[0].payload).toEqual({value:1});});
 it.each([-1,7,0.5,null,'2'])('rejects invalid Mana %s',async(value)=>{const p=port();await expect(executeSheetCommand(fixture(),form({payload:JSON.stringify({value})}),p.adapter)).rejects.toThrow();expect(p.calls.length).toBe(0);});
 it('rejects other players and stale versions',async()=>{const p=port();await expect(executeSheetCommand(fixture(OTHER),form(),p.adapter)).rejects.toThrow('access');await expect(executeSheetCommand(fixture(),form({version:OTHER}),p.adapter)).rejects.toThrow('changed');expect(p.calls.length).toBe(0);});
 it.each(['number','level','floor','base-stats','favor-award','effect-add','effect-toggle','effect-remove','defense'])('reserves %s for GM',async(operation)=>{const p=port();await expect(executeSheetCommand(fixture(),form({operation,payload:'{}'}),p.adapter)).rejects.toThrow('Only the GM');expect(p.calls.length).toBe(0);});
 it('permits owning player renames only and trims whitespace',async()=>{const p=port();await executeSheetCommand(fixture(),form({operation:'name',payload:JSON.stringify({value:' Renamed '})}),p.adapter);expect(p.calls[0].payload).toEqual({value:'Renamed'});await expect(executeSheetCommand(fixture(GM),form({operation:'name',payload:JSON.stringify({value:'GM rename'})}),p.adapter)).rejects.toThrow('owning player');});
 it('rejects blank names',async()=>{await expect(executeSheetCommand(fixture(),form({operation:'name',payload:JSON.stringify({value:'   '})}),port().adapter)).rejects.toThrow('name');});
 it('uses stored DR and never trusts client health fields',async()=>{const p=port();await executeSheetCommand(fixture(),form({operation:'damage',payload:JSON.stringify({parts:[{type:'Fire',amount:8}],dr:999,slots:10})}),p.adapter);expect(p.calls[0].payload).toEqual({parts:[{type:'Fire',amount:8}]});});
 it('heals by slots and refuses invalid amounts',async()=>{const p=port();await executeSheetCommand(fixture(),form({operation:'healing',payload:'{"amount":2}'}),p.adapter);await expect(executeSheetCommand(fixture(),form({operation:'healing',payload:'{"amount":0}'}),p.adapter)).rejects.toThrow();expect(p.calls.length).toBe(1);});
 it('spends Favor once without trusting an input total',async()=>{const p=port();await executeSheetCommand(fixture(),form({operation:'favor-use',payload:'{"favor":999}'}),p.adapter);expect(p.calls[0].payload).toEqual({});const w=fixture(),r=w.tutorials![ID];await expect(executeSheetCommand({...w,tutorials:{[ID]:{...r,profile:{...r.profile,favor:0}}}},form({operation:'favor-use',payload:'{}'}),p.adapter)).rejects.toThrow('No AI Favor');});
 it('sends base stats without manually supplied Enhanced values',async()=>{const p=port();const bases={strength:10,intelligence:10,constitution:10,dexterity:10,charisma:10};await executeSheetCommand(fixture(GM),form({operation:'base-stats',payload:JSON.stringify({bases,enhanced:{strength:999}})}),p.adapter);expect(p.calls[0].payload).toEqual({bases});});
 it('validates signed active modifiers before writing',async()=>{const p=port();await executeSheetCommand(fixture(GM),form({operation:'effect-add',payload:JSON.stringify({name:'Buff',active:true,modifiers:{strength:2,intelligence:0,constitution:0,dexterity:0,charisma:0}})}),p.adapter);expect(p.calls[0].payload.name).toBe('Buff');await expect(executeSheetCommand(fixture(GM),form({operation:'effect-toggle',payload:'{"id":"missing","active":true}'}),p.adapter)).rejects.toThrow('unavailable');});
 it.each([['level',0],['level',1001],['floor',19],['number',0]])('rejects identity bounds %s %s',async(operation,value)=>{await expect(executeSheetCommand(fixture(GM),form({operation,payload:JSON.stringify({value})}),port().adapter)).rejects.toThrow();});
 it('does not report success on storage failure',async()=>{await expect(executeSheetCommand(fixture(),form(),{async act(){throw new Error('Conflict');}})).rejects.toThrow('Conflict');});
});
