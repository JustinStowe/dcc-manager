import { describe, expect, it } from 'vitest';
import { addCampaignPlayer, createCampaign } from '@/domain';
import { createCrawler } from '@/domain/crawler';
import { createTutorialProfile } from '@/domain/tutorial';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
import type { CampaignWorkspace } from './campaign-workspace';
import { executeTutorialCommand, type TutorialPort } from './tutorial-commands';

const GM='11111111-1111-1111-1111-111111111111', PLAYER='22222222-2222-2222-2222-222222222222', GAME='77777777-7777-7777-7777-777777777777', ID='55555555-5555-5555-5555-555555555555', VERSION='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
function fixture(userId=PLAYER, mode: 'empty'|'official'|'prototype'='official'): CampaignWorkspace {
  const campaign=addCampaignPlayer(createCampaign({id:GAME,name:'One',gmUserId:GM}),GM,PLAYER);
  const profile=createTutorialProfile(tutorialDraftFixture());
  const crawler=createCrawler({id:ID,campaignId:GAME,name:'Carl',baseSegments:10,constitution:3,...(mode==='official'?{ruleset:'tutorial-v1' as const}:{})});
  return {userId,campaign:{...campaign,crawlers:mode==='empty'?[]:[{ownerUserId:PLAYER,crawler}]},versions:{[ID]:VERSION},tutorials:mode==='official'?{[ID]:{profile,number:500000}}:{}};
}
function makePort(){const calls:unknown[]=[];const port:TutorialPort={async create(v){calls.push(['create',v]);},async act(v){calls.push(['act',v]);}};return {port,calls};}
function form(values:Record<string,string>){const f=new FormData();for(const[k,v]of Object.entries(values))f.set(k,v);return f;}
const creation={operation:'tutorial-create',ownerUserId:PLAYER,name:'Carl',draft:JSON.stringify(tutorialDraftFixture())};
const damage={operation:'tutorial-damage',crawlerId:ID,version:VERSION,amount:'4'};

describe('Tutorial application commands',()=>{
  it('can create a fresh game crawler without saving an account profile', async () => {
    const { port, calls } = makePort();
    await executeTutorialCommand(fixture(PLAYER, 'empty'), form(creation), port);
    expect(calls[0]).toEqual(['create', expect.objectContaining({ saveSlot: null })]);
  });
  it('passes an optional profile slot for atomic creation and saving', async () => {
    const { port, calls } = makePort();
    await executeTutorialCommand(fixture(PLAYER, 'empty'), form({ ...creation, saveSlot: '3' }), port);
    expect(calls[0]).toEqual(['create', expect.objectContaining({ saveSlot: 3 })]);
  });
  it('rejects saving another player crawler to the GM profile slots', async () => {
    const { port, calls } = makePort();
    await expect(executeTutorialCommand(fixture(GM, 'empty'), form({ ...creation, saveSlot: '1' }), port)).rejects.toThrow('only your own');
    expect(calls).toHaveLength(0);
  });
  it('creates only a validated Level 1 build',async()=>{const{port,calls}=makePort();await executeTutorialCommand(fixture(PLAYER,'empty'),form(creation),port);expect(calls.length).toBe(1);});
  it('prevents assigning a player build to another account',async()=>{const{port,calls}=makePort();await expect(executeTutorialCommand(fixture(PLAYER,'empty'),form({...creation,ownerUserId:GM}),port)).rejects.toThrow();expect(calls.length).toBe(0);});
  it('prevents replacing a saved crawler through creation',async()=>{const{port,calls}=makePort();await expect(executeTutorialCommand(fixture(),form(creation),port)).rejects.toThrow();expect(calls.length).toBe(0);});
  it('requires a saved roll ID for rolled creation',async()=>{const{port}=makePort();await expect(executeTutorialCommand(fixture(PLAYER,'empty'),form({...creation,draft:JSON.stringify({...tutorialDraftFixture(),method:'rolled'})}),port)).rejects.toThrow('Roll or recover');});
  it('passes the roll ID for authoritative database checking',async()=>{const{port,calls}=makePort();await executeTutorialCommand(fixture(PLAYER,'empty'),form({...creation,rollId:VERSION,draft:JSON.stringify({...tutorialDraftFixture(),method:'rolled'})}),port);expect(calls.length).toBe(1);});
  it('allows owners to record net damage',async()=>{const{port,calls}=makePort();const message=await executeTutorialCommand(fixture(),form(damage),port);expect(message).toBe('2 health slots lost. Unused damage is discarded.');expect(calls.length).toBe(1);});
  it('rejects stale forms before a write',async()=>{const{port,calls}=makePort();await expect(executeTutorialCommand(fixture(),form({...damage,version:GM}),port)).rejects.toThrow('Crawler changed');expect(calls.length).toBe(0);});
  it('rejects a foreign crawler ID',async()=>{const{port,calls}=makePort();await expect(executeTutorialCommand(fixture(),form({...damage,crawlerId:GM}),port)).rejects.toThrow();expect(calls.length).toBe(0);});
  it('prevents owners from awarding themselves AI Favor',async()=>{const{port,calls}=makePort();await expect(executeTutorialCommand(fixture(),form({...damage,operation:'tutorial-favor-award'}),port)).rejects.toThrow();expect(calls.length).toBe(0);});
  it('allows the GM to award Favor',async()=>{const{port,calls}=makePort();await executeTutorialCommand(fixture(GM),form({...damage,operation:'tutorial-favor-award'}),port);expect(calls.length).toBe(1);});
  it('rejects spending more Mana than available',async()=>{const{port,calls}=makePort();await expect(executeTutorialCommand(fixture(),form({...damage,operation:'tutorial-mana-spend',amount:'7'}),port)).rejects.toThrow('Not enough Mana');expect(calls.length).toBe(0);});
  it('prevents player stat edits',async()=>{const{port}=makePort();await expect(executeTutorialCommand(fixture(),form({...damage,operation:'tutorial-stats',stats:JSON.stringify(createTutorialProfile(tutorialDraftFixture()).stats)}),port)).rejects.toThrow('Only the GM');});
  it('allows validated GM stat edits',async()=>{const{port,calls}=makePort();await executeTutorialCommand(fixture(GM),form({...damage,operation:'tutorial-stats',stats:JSON.stringify(createTutorialProfile(tutorialDraftFixture()).stats)}),port);expect(calls.length).toBe(1);});
  it('prevents player Crawler Number edits',async()=>{const{port}=makePort();await expect(executeTutorialCommand(fixture(),form({...damage,operation:'tutorial-number',crawlerNumber:'500001'}),port)).rejects.toThrow('Only the GM');});
  it('requires GM review for conversion',async()=>{const{port,calls}=makePort();await expect(executeTutorialCommand(fixture(PLAYER,'prototype'),form({...creation,operation:'tutorial-convert',crawlerId:ID,version:VERSION,remainingSlots:'5',reviewed:'yes'}),port)).rejects.toThrow('GM');expect(calls.length).toBe(0);});
  it('requires explicit conversion confirmation',async()=>{const{port}=makePort();await expect(executeTutorialCommand(fixture(GM,'prototype'),form({...creation,operation:'tutorial-convert',crawlerId:ID,version:VERSION,remainingSlots:'5'}),port)).rejects.toThrow('review');});
  it('allows reviewed GM conversion of an existing prototype',async()=>{const{port,calls}=makePort();await executeTutorialCommand(fixture(GM,'prototype'),form({...creation,operation:'tutorial-convert',crawlerId:ID,version:VERSION,remainingSlots:'5',reviewed:'yes'}),port);expect(calls.length).toBe(1);});
  it('rejects unknown actions without writing',async()=>{const{port,calls}=makePort();await expect(executeTutorialCommand(fixture(),form({...damage,operation:'tutorial-godmode'}),port)).rejects.toThrow();expect(calls.length).toBe(0);});
});
