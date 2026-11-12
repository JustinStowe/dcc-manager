import { describe, expect, it } from 'vitest';
import { addCampaignPlayer, createCampaign } from '@/domain';
import { createCrawler } from '@/domain/crawler';
import { createTutorialProfile } from '@/domain/tutorial';
import { seedAbilities } from '@/domain/abilities';
import { type Hotlist } from '@/domain/loadout';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
import type { CampaignWorkspace } from './campaign-workspace';
import { executeSkillCommand, type SkillWrite } from './skill-commands';
const GM='11111111-1111-1111-1111-111111111111', PLAYER='22222222-2222-2222-2222-222222222222', OTHER='33333333-3333-3333-3333-333333333333';
const GAME='77777777-7777-7777-7777-777777777777', ID='55555555-5555-5555-5555-555555555555', ITEM='66666666-6666-4666-8666-666666666666', VERSION='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
function fixture(userId=PLAYER, health=10): CampaignWorkspace {
  let campaign=addCampaignPlayer(createCampaign({id:GAME,name:'Game',gmUserId:GM}),GM,PLAYER);campaign=addCampaignPlayer(campaign,GM,OTHER);
  const profile={...createTutorialProfile(tutorialDraftFixture()),mana:2};
  const crawler={...createCrawler({id:ID,campaignId:GAME,name:'Carl',baseSegments:10,constitution:3,ruleset:'tutorial-v1'}),currentSegments:health};
  const hotlist:Hotlist=[{kind:'item',target:ITEM},{kind:'skill',target:'heal'},...Array.from({length:8},()=>null)];
  return {userId,campaign:{...campaign,crawlers:[{ownerUserId:PLAYER,crawler}]},versions:{[ID]:VERSION},tutorials:{[ID]:{profile,number:500000}},skills:{[ID]:seedAbilities(profile)},inventories:{[ID]:[{id:ITEM,name:'Hat',kind:'gear',quantity:1,notes:'',gearSlot:'head',location:'stored'}]},loadouts:{[ID]:{baseline:profile.stats,defenseBase:0,hotlist}}};
}
function form(changes:Record<string,string>={}) {const result=new FormData();for(const[k,v]of Object.entries({crawlerId:ID,version:VERSION,operation:'mark',skillId:'longsword',marked:'true',...changes}))result.set(k,v);return result;}
function port(){const calls:SkillWrite[]=[];return{calls,adapter:{async act(v:SkillWrite){calls.push(v);}}};}
describe('learned ability command permissions',()=>{
  it.each([PLAYER,GM])('permits own or GM marks %s',async(user)=>{const p=port();await executeSkillCommand(fixture(user),form(),p.adapter);expect(p.calls.length).toBe(1);expect(p.calls[0].marked).toBe(true);expect(p.calls[0].definition).toBe(null);});
  it('rejects other players and stale writes',async()=>{const p=port();await expect(executeSkillCommand(fixture(OTHER),form(),p.adapter)).rejects.toThrow('access');await expect(executeSkillCommand(fixture(),form({version:OTHER}),p.adapter)).rejects.toThrow('changed');expect(p.calls.length).toBe(0);});
  it.each(['learn','learn-catalog','edit','remove','advance'])('reserves %s for GM',async(operation)=>{const p=port();await expect(executeSkillCommand(fixture(),form({operation}),p.adapter)).rejects.toThrow('Only the GM');expect(p.calls.length).toBe(0);});
  it('allows GM catalog awards with reviewed rank only',async()=>{const p=port();await executeSkillCommand(fixture(GM),form({operation:'learn-catalog',catalogId:'fire-fingers',rank:'2',reviewed:'yes',manaCost:'0',automation:'tutorial-heal'}),p.adapter);expect(p.calls[0].id).toBe('fire-fingers');expect(p.calls[0].definition).toEqual({rank:2});});
  it('rejects duplicate or invented catalog awards',async()=>{const p=port();for(const catalogId of ['longsword','invented','heal'])await expect(executeSkillCommand(fixture(GM),form({operation:'learn-catalog',catalogId,rank:'1',reviewed:'yes'}),p.adapter)).rejects.toThrow();expect(p.calls.length).toBe(0);});
  it('requires reviewed definitions',async()=>{const p=port();await expect(executeSkillCommand(fixture(GM),form({operation:'learn-catalog',catalogId:'fire-fingers',rank:'2'}),p.adapter)).rejects.toThrow('Confirm');expect(p.calls.length).toBe(0);});
  it('forces custom abilities to manual automation',async()=>{const p=port();await executeSkillCommand(fixture(GM),form({operation:'learn',name:'Custom Spark',kind:'spell',rank:'1',maxRank:'15',stat:'intelligence',advancement:'normal',manaCost:'4',reviewed:'yes',automation:'tutorial-heal'}),p.adapter);expect(p.calls[0].definition).toEqual(expect.objectContaining({automation:'manual',manaCost:4}));});
  it('does not allow protected Heal removal or editing',async()=>{const p=port();await expect(executeSkillCommand(fixture(GM),form({operation:'remove',skillId:'heal',confirmed:'yes'}),p.adapter)).rejects.toThrow('Heal');await expect(executeSkillCommand(fixture(GM),form({operation:'edit',skillId:'heal',reviewed:'yes'}),p.adapter)).rejects.toThrow('Heal');expect(p.calls.length).toBe(0);});
  it('validates marks and advancement results before writing',async()=>{const p=port();await expect(executeSkillCommand(fixture(),form({skillId:'heal'}),p.adapter)).rejects.toThrow();const w=fixture(GM),rows=w.skills![ID].map((a)=>a.id==='longsword'?{...a,marked:true}:a);await executeSkillCommand({...w,skills:{[ID]:rows}},form({operation:'advance',window:'two-hour',die:'3',modifier:'0',reviewed:'yes'}),p.adapter);expect(p.calls.length).toBe(1);expect(p.calls[0].die).toBe(3);});
  it('casts prepared Heal in one write and ignores client Mana',async()=>{const p=port();await executeSkillCommand(fixture(),form({operation:'cast',skillId:'heal',confirmed:'yes',mana:'999'}),p.adapter);expect(p.calls.length).toBe(1);expect(p.calls[0].operation).toBe('cast');});
  it('does not report success for a failed database write',async()=>{await expect(executeSkillCommand(fixture(),form(),{async act(){throw new Error('Conflict');}})).rejects.toThrow('Conflict');});
});
