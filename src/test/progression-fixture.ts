import type { CampaignWorkspace } from '@/services/campaign-workspace';
import { createTutorialProfile } from '@/domain/tutorial';
import { seedAbilities } from '@/domain/abilities';
import { INITIAL_ADVANCEMENT } from '@/domain/advancement';
import { INITIAL_THIRD_FLOOR } from '@/domain/third-floor';
import { INITIAL_PROGRESSION } from '@/domain/progression';
import { tutorialDraftFixture } from './tutorial-fixture';
export const PG_IDS={gm:'11111111-1111-4111-8111-111111111111',player:'22222222-2222-4222-8222-222222222222',other:'33333333-3333-4333-8333-333333333333',game:'44444444-4444-4444-8444-444444444444',crawler:'55555555-5555-4555-8555-555555555555',version:'66666666-6666-4666-8666-666666666666'};
export function progressionFixture(userId=PG_IDS.gm):CampaignWorkspace{
 const i=PG_IDS,profile=createTutorialProfile(tutorialDraftFixture());
 return{userId,campaign:{id:i.game,name:'Test game',gmUserId:i.gm,playerUserIds:[i.player,i.other],crawlers:[{ownerUserId:i.player,crawler:{id:i.crawler,campaignId:i.game,name:'Carl',baseSegments:10,constitution:3,currentSegments:0,ruleset:'tutorial-v1'}}]},versions:{[i.crawler]:i.version},tutorials:{[i.crawler]:{profile,number:500000}},inventories:{[i.crawler]:[]},skills:{[i.crawler]:seedAbilities(profile)},loadouts:{[i.crawler]:{baseline:profile.stats,defenseBase:0,hotlist:[null,null,null,null,null,null,null,null,null,null]}},sheets:{[i.crawler]:{level:9,floor:3,effects:[],advancement:INITIAL_ADVANCEMENT,thirdFloor:INITIAL_THIRD_FLOOR,progression:INITIAL_PROGRESSION}}};
}
export function progressionForm(operation:string,payload:Record<string,unknown>={}){const f=new FormData();for(const[k,v]of Object.entries({crawlerId:PG_IDS.crawler,version:PG_IDS.version,operation,payload:JSON.stringify({reason:'GM reviewed at the table',confirmed:true,...payload})}))f.set(k,v);return f;}
