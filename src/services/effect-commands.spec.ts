import { describe,expect,it } from 'vitest';
import { addCampaignPlayer,createCampaign } from '@/domain';
import { createCrawler } from '@/domain/crawler';
import { createTutorialProfile } from '@/domain/tutorial';
import { seedAbilities } from '@/domain/abilities';
import type { Hotlist } from '@/domain/loadout';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
import type { CampaignWorkspace } from './campaign-workspace';
import { executeEffectCommand,type EffectWrite } from './effect-commands';
const GM='11111111-1111-1111-1111-111111111111', PLAYER='22222222-2222-2222-2222-222222222222', OTHER='33333333-3333-3333-3333-333333333333';
const GAME='77777777-7777-7777-7777-777777777777', ID='55555555-5555-5555-5555-555555555555', ITEM='66666666-6666-4666-8666-666666666666', VERSION='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
function fixture(userId=PLAYER, health=10): CampaignWorkspace {
  let campaign=addCampaignPlayer(createCampaign({id:GAME,name:'Game',gmUserId:GM}),GM,PLAYER);campaign=addCampaignPlayer(campaign,GM,OTHER);
  const profile={...createTutorialProfile(tutorialDraftFixture()),mana:2};
  const crawler={...createCrawler({id:ID,campaignId:GAME,name:'Carl',baseSegments:10,constitution:3,ruleset:'tutorial-v1'}),currentSegments:health};
  const hotlist:Hotlist=[{kind:'item',target:ITEM},{kind:'skill',target:'heal'},...Array.from({length:8},()=>null)];
  return {userId,campaign:{...campaign,crawlers:[{ownerUserId:PLAYER,crawler}]},versions:{[ID]:VERSION},tutorials:{[ID]:{profile,number:500000}},sheets:{[ID]:{level:1,floor:1,effects:[],trackedEffects:[],baseDefenses:{}}},skills:{[ID]:seedAbilities(profile)},inventories:{[ID]:[{id:ITEM,name:'Hat',kind:'gear',quantity:1,notes:'',gearSlot:'head',location:'stored'}]},loadouts:{[ID]:{baseline:profile.stats,defenseBase:0,hotlist}}};
}
function form(changes:Record<string,string>={}) {const result=new FormData();for(const[k,v]of Object.entries({crawlerId:ID,version:VERSION,operation:'add',name:'Buff',kind:'buff',source:'Test',notes:'',active:'yes',rounds:'2',strength:'2',intelligence:'0',constitution:'0',dexterity:'0',charisma:'0',...changes}))result.set(k,v);return result;}
function port(){const calls:EffectWrite[]=[];return{calls,adapter:{async act(v:EffectWrite){calls.push(v);}}};}
describe('GM effect boundary',()=>{
 it('awards a validated source without trusting supplied health fields',async()=>{const p=port();await executeEffectCommand(fixture(GM),form({health:'10'}),p.adapter);expect(p.calls.length).toBe(1);expect(p.calls[0].operation).toBe('add');expect(p.calls[0].payload.definition).toEqual(expect.objectContaining({name:'Buff',remainingRounds:2,source:'Test'}));});
 it.each([PLAYER,OTHER])('denies player mutation %s',async(user)=>{const p=port();await expect(executeEffectCommand(fixture(user),form(),p.adapter)).rejects.toThrow('Only');expect(p.calls.length).toBe(0);});
 it('rejects stale saves before any write',async()=>{const p=port();await expect(executeEffectCommand(fixture(GM),form({version:OTHER}),p.adapter)).rejects.toThrow('changed');expect(p.calls.length).toBe(0);});
 it('requires loaded tracked records',async()=>{const w=fixture(GM);await expect(executeEffectCommand({...w,sheets:{[ID]:{...w.sheets![ID],trackedEffects:undefined}}},form(),port().adapter)).rejects.toThrow('migration');});
 it.each(['0','-1','1.5','10001'])('rejects active invalid countdown %s',async(rounds)=>{await expect(executeEffectCommand(fixture(GM),form({rounds}),port().adapter)).rejects.toThrow();});
 it('supports unlimited effects with a blank countdown',async()=>{const p=port();await executeEffectCommand(fixture(GM),form({rounds:''}),p.adapter);expect(p.calls[0].payload.definition).toEqual(expect.objectContaining({remainingRounds:null}));});
 it('requires confirmation for a round advance',async()=>{await expect(executeEffectCommand(fixture(GM),form({operation:'tick'}),port().adapter)).rejects.toThrow('Confirm');const p=port();await executeEffectCommand(fixture(GM),form({operation:'tick',confirmed:'yes'}),p.adapter);expect(p.calls[0].operation).toBe('tick');});
 it('rejects missing targets and unknown operations',async()=>{const p=port();await expect(executeEffectCommand(fixture(GM),form({operation:'toggle',effectId:'missing'}),p.adapter)).rejects.toThrow('unavailable');expect(p.calls.length).toBe(0);});
 it('propagates an atomic write failure',async()=>{await expect(executeEffectCommand(fixture(GM),form(),{async act(){throw new Error('Storage unavailable');}})).rejects.toThrow('Storage');});
});
