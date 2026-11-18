import {describe,expect,it} from 'vitest';
import {addCampaignPlayer,createCampaign} from '@/domain';
import {createCrawler} from '@/domain/crawler';
import {createTutorialProfile} from '@/domain/tutorial';
import {seedAbilities} from '@/domain/abilities';
import type {Hotlist} from '@/domain/loadout';
import {tutorialDraftFixture} from '@/test/tutorial-fixture';
import type {CampaignWorkspace} from './campaign-workspace';
import {executeTemplateCommand,type TemplateWrite} from './template-commands';
import type {EffectTemplate} from '@/domain/effect-templates';
const GM='11111111-1111-1111-1111-111111111111', PLAYER='22222222-2222-2222-2222-222222222222', OTHER='33333333-3333-3333-3333-333333333333';
const GAME='77777777-7777-7777-7777-777777777777', ID='55555555-5555-5555-5555-555555555555', ITEM='66666666-6666-4666-8666-666666666666', VERSION='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
function fixture(userId=PLAYER, health=10): CampaignWorkspace {
  let campaign=addCampaignPlayer(createCampaign({id:GAME,name:'Game',gmUserId:GM}),GM,PLAYER);campaign=addCampaignPlayer(campaign,GM,OTHER);
  const profile={...createTutorialProfile(tutorialDraftFixture()),mana:2};
  const crawler={...createCrawler({id:ID,campaignId:GAME,name:'Carl',baseSegments:10,constitution:3,ruleset:'tutorial-v1'}),currentSegments:health};
  const hotlist:Hotlist=[{kind:'item',target:ITEM},{kind:'skill',target:'heal'},...Array.from({length:8},()=>null)];
  return {userId,campaign:{...campaign,crawlers:[{ownerUserId:PLAYER,crawler}]},versions:{[ID]:VERSION},tutorials:{[ID]:{profile,number:500000}},sheets:{[ID]:{level:1,floor:1,effects:[],trackedEffects:[],baseDefenses:{}}},skills:{[ID]:seedAbilities(profile)},inventories:{[ID]:[{id:ITEM,name:'Hat',kind:'gear',quantity:1,notes:'',gearSlot:'head',location:'stored'}]},loadouts:{[ID]:{baseline:profile.stats,defenseBase:0,hotlist}}};
}

const TEMPLATE='99999999-9999-9999-9999-999999999999';
const definition={name:'Might',kind:'buff' as const,source:'',notes:'',remainingRounds:2,modifiers:{strength:2,intelligence:0,constitution:0,dexterity:0,charisma:0},defenses:{}};
const template:EffectTemplate={id:TEMPLATE,campaignId:GAME,version:VERSION,repeatPolicy:'refresh',definition};
function workspace(user=GM):CampaignWorkspace{const w=fixture(user);return{...w,templates:[template],inventories:{[ID]:[{id:ITEM,name:'Potion',kind:'consumable',quantity:2,notes:'',gearSlot:'none',location:'stored',effect:'manual'}]}};}
function form(changes:Record<string,string>={}){const f=new FormData();for(const[k,v]of Object.entries({operation:'add',name:'Might',kind:'buff',policy:'refresh',rounds:'2',strength:'2',intelligence:'0',constitution:'0',dexterity:'0',charisma:'0',...changes}))f.set(k,v);return f;}
function port(){const calls:TemplateWrite[]=[];return{calls,adapter:{async act(input:TemplateWrite){calls.push(input);}}};}
function link(changes:Record<string,string>={}){return form({operation:'link',crawlerId:ID,version:VERSION,kind:'item',target:ITEM,templateId:TEMPLATE,...changes});}
describe('GM template commands',()=>{
 it('creates normalized campaign-scoped templates ignoring client origin and active fields',async()=>{const p=port();await executeTemplateCommand(workspace(),form({campaignId:OTHER,active:'false',templateVersion:OTHER}),p.adapter);expect(p.calls[0].campaignId).toBe(GAME);expect(p.calls[0].definition).toEqual(definition);});
 it.each([PLAYER,OTHER])('denies player management %s',async user=>{const p=port();await expect(executeTemplateCommand(workspace(user),form(),p.adapter)).rejects.toThrow('Only');expect(p.calls.length).toBe(0);});
 it('requires template data and rejects unknown actions',async()=>{await expect(executeTemplateCommand({...workspace(),templates:undefined},form(),port().adapter)).rejects.toThrow('migration');await expect(executeTemplateCommand(workspace(),form({operation:'destroy'}),port().adapter)).rejects.toThrow('Unknown');});
 it.each(['0','-1','1.5','10001'])('rejects unusable duration %s',async rounds=>{await expect(executeTemplateCommand(workspace(),form({rounds}),port().adapter)).rejects.toThrow();});
 it('requires matching template version for edits and deletion confirmation',async()=>{const p=port();await expect(executeTemplateCommand(workspace(),form({operation:'edit',templateId:TEMPLATE,templateVersion:OTHER}),p.adapter)).rejects.toThrow('changed');await expect(executeTemplateCommand(workspace(),form({operation:'remove',templateId:TEMPLATE,templateVersion:VERSION}),p.adapter)).rejects.toThrow('Confirm');expect(p.calls.length).toBe(0);});
 it('removes with a reviewed version without requiring definition fields',async()=>{const p=port();await executeTemplateCommand(workspace(),form({operation:'remove',templateId:TEMPLATE,templateVersion:VERSION,confirmed:'yes'}),p.adapter);expect(p.calls[0].confirmed).toBe(true);});
 it('links and unlinks a supported consumable with its opening crawler version',async()=>{const p=port();await executeTemplateCommand(workspace(),link(),p.adapter);await executeTemplateCommand(workspace(),link({templateId:''}),p.adapter);expect(p.calls[0].templateId).toBe(TEMPLATE);expect(p.calls[0].crawlerVersion).toBe(VERSION);expect(p.calls[1].templateId).toBe(undefined);});
 it('rejects stale or missing crawler targets before writing',async()=>{const p=port();await expect(executeTemplateCommand(workspace(),link({version:OTHER}),p.adapter)).rejects.toThrow('changed');await expect(executeTemplateCommand(workspace(),link({crawlerId:OTHER}),p.adapter)).rejects.toThrow('unavailable');expect(p.calls.length).toBe(0);});
 it('prevents protected Heal, mana-full and missing targets from linking',async()=>{const w=workspace();await expect(executeTemplateCommand(w,link({kind:'spell',target:'heal'}),port().adapter)).rejects.toThrow('manual');await expect(executeTemplateCommand({...w,inventories:{[ID]:[{...w.inventories![ID][0],effect:'mana-full'}]}},link(),port().adapter)).rejects.toThrow('manual');await expect(executeTemplateCommand(w,link({target:'missing'}),port().adapter)).rejects.toThrow('manual');});
 it('rejects foreign template IDs even if submitted with a valid crawler',async()=>{await expect(executeTemplateCommand(workspace(),link({templateId:OTHER}),port().adapter)).rejects.toThrow('game');});
 it('rejects unknown policies, enforces campaign limit and propagates storage failure',async()=>{await expect(executeTemplateCommand(workspace(),form({policy:'duplicate'}),port().adapter)).rejects.toThrow('policy');await expect(executeTemplateCommand({...workspace(),templates:Array.from({length:100},()=>template)},form(),port().adapter)).rejects.toThrow('limit');await expect(executeTemplateCommand(workspace(),form(),{async act(){throw new Error('Storage unavailable');}})).rejects.toThrow('Storage');});
});
