import { describe, expect, it } from 'vitest';
import { addCampaignPlayer, createCampaign } from '@/domain';
import { createCrawler } from '@/domain/crawler';
import { createTutorialProfile } from '@/domain/tutorial';
import { ZERO_BONUSES, type Hotlist } from '@/domain/loadout';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
import type { CampaignWorkspace } from './campaign-workspace';
import { executeLoadoutCommand, type LoadoutWrite } from './loadout-commands';

const GM='11111111-1111-1111-1111-111111111111', PLAYER='22222222-2222-2222-2222-222222222222', OTHER='33333333-3333-3333-3333-333333333333';
const GAME='77777777-7777-7777-7777-777777777777', ID='55555555-5555-5555-5555-555555555555', ITEM='66666666-6666-4666-8666-666666666666', VERSION='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
function fixture(userId=PLAYER, health=10): CampaignWorkspace {
  let campaign=addCampaignPlayer(createCampaign({id:GAME,name:'Game',gmUserId:GM}),GM,PLAYER);campaign=addCampaignPlayer(campaign,GM,OTHER);
  const profile={...createTutorialProfile(tutorialDraftFixture()),mana:2};
  const crawler={...createCrawler({id:ID,campaignId:GAME,name:'Carl',baseSegments:10,constitution:3,ruleset:'tutorial-v1'}),currentSegments:health};
  const hotlist:Hotlist=[{kind:'item',target:ITEM},{kind:'skill',target:'heal'},...Array.from({length:8},()=>null)];
  return {userId,campaign:{...campaign,crawlers:[{ownerUserId:PLAYER,crawler}]},versions:{[ID]:VERSION},tutorials:{[ID]:{profile,number:500000}},inventories:{[ID]:[{id:ITEM,name:'Hat',kind:'gear',quantity:1,notes:'',gearSlot:'head',location:'stored'}]},loadouts:{[ID]:{baseline:profile.stats,defenseBase:0,hotlist}}};
}
function form(changes:Record<string,string>={}) {const result=new FormData();for(const[k,v]of Object.entries({crawlerId:ID,version:VERSION,operation:'assign',slot:'3',target:`item:${ITEM}`,...changes}))result.set(k,v);return result;}
function port(){const calls:LoadoutWrite[]=[];return{calls,adapter:{async act(v:LoadoutWrite){calls.push(v);}}};}
describe('Loadout application boundary',()=>{
  it.each([PLAYER,GM])('allows owner or GM preparation: %s',async(user)=>{const p=port();await executeLoadoutCommand(fixture(user),form(),p.adapter);expect(p.calls[0].target).toBe(ITEM);expect(p.calls[0].slot).toBe(3);});
  it('rejects another player',async()=>{const p=port();await expect(executeLoadoutCommand(fixture(OTHER),form(),p.adapter)).rejects.toThrow('access');expect(p.calls.length).toBe(0);});
  it('rejects stale versions',async()=>{const p=port();await expect(executeLoadoutCommand(fixture(),form({version:OTHER}),p.adapter)).rejects.toThrow('changed');expect(p.calls.length).toBe(0);});
  it.each(['0','11','1.5'])('rejects slot %s',async(slot)=>{const p=port();await expect(executeLoadoutCommand(fixture(),form({slot}),p.adapter)).rejects.toThrow();expect(p.calls.length).toBe(0);});
  it('requires loaded state',async()=>{const p=port();await expect(executeLoadoutCommand({...fixture(),loadouts:undefined},form(),p.adapter)).rejects.toThrow('loaded');expect(p.calls.length).toBe(0);});
  it('rejects missing inventory targets and unknown Spells',async()=>{const p=port();await expect(executeLoadoutCommand(fixture(),form({target:`item:${OTHER}`}),p.adapter)).rejects.toThrow();await expect(executeLoadoutCommand(fixture(),form({target:'skill:unknown'}),p.adapter)).rejects.toThrow();expect(p.calls.length).toBe(0);});
  it('rejects Hotlist mutation while Dying',async()=>{const p=port();await expect(executeLoadoutCommand(fixture(PLAYER,0),form(),p.adapter)).rejects.toThrow('Dying');expect(p.calls.length).toBe(0);});
  it('requires timing confirmation and checks Heal Mana',async()=>{const p=port();await expect(executeLoadoutCommand(fixture(),form({operation:'use',slot:'2'}),p.adapter)).rejects.toThrow('Confirm');const w=fixture();const record=w.tutorials![ID];await expect(executeLoadoutCommand({...w,tutorials:{[ID]:{...record,profile:{...record.profile,mana:1}}}},form({operation:'use',slot:'2',confirmed:'yes'}),p.adapter)).rejects.toThrow('2 Mana');expect(p.calls.length).toBe(0);});
  it('calls a single prepared Heal operation without trusting client resource fields',async()=>{const p=port();await executeLoadoutCommand(fixture(),form({operation:'use',slot:'2',confirmed:'yes',mana:'999'}),p.adapter);expect(p.calls.length).toBe(1);expect(p.calls[0].operation).toBe('use');expect(p.calls[0].amount).toBe(0);});
  it('prevents preparing an armor item into a hand',async()=>{const p=port();await expect(executeLoadoutCommand(fixture(),form({operation:'ready',slot:'1',location:'main-hand',confirmed:'yes'}),p.adapter)).rejects.toThrow('holding');expect(p.calls.length).toBe(0);});
  it('limits gear definitions and defense baselines to GM',async()=>{const p=port();await expect(executeLoadoutCommand(fixture(),form({operation:'bonuses'}),p.adapter)).rejects.toThrow('Only the GM');await expect(executeLoadoutCommand(fixture(),form({operation:'defense',amount:'4'}),p.adapter)).rejects.toThrow('Only the GM');expect(p.calls.length).toBe(0);});
  it('requires review before defining gear',async()=>{const p=port();await expect(executeLoadoutCommand(fixture(GM),form({operation:'bonuses'}),p.adapter)).rejects.toThrow('Review');expect(p.calls.length).toBe(0);});
  it('sends reviewed bonuses and baseline in one write',async()=>{const p=port();const values=Object.fromEntries(Object.keys(ZERO_BONUSES).map((key)=>[`bonus-${key}`,key==='intelligence'?'2':'0']));await executeLoadoutCommand(fixture(GM),form({...values,operation:'bonuses',itemId:ITEM,stats:JSON.stringify(fixture().loadouts![ID].baseline),reviewed:'yes'}),p.adapter);expect(p.calls.length).toBe(1);expect(p.calls[0].bonuses?.intelligence).toBe(2);expect(p.calls[0].baseline?.intelligence.enhanced).toBe(6);});
  it('allows positive raw damage but rejects negative damage and negative DR',async()=>{const p=port();await executeLoadoutCommand(fixture(),form({operation:'damage-dr',amount:'8'}),p.adapter);await expect(executeLoadoutCommand(fixture(),form({operation:'damage-dr',amount:'-1'}),p.adapter)).rejects.toThrow();await expect(executeLoadoutCommand(fixture(GM),form({operation:'defense',amount:'-1'}),p.adapter)).rejects.toThrow();expect(p.calls.length).toBe(1);});
  it('propagates a failed atomic write without claiming success',async()=>{await expect(executeLoadoutCommand(fixture(),form(),{async act(){throw new Error('Concurrent update');}})).rejects.toThrow('Concurrent');});
});
