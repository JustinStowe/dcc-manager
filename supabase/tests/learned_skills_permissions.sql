-- Run the complete script as administrator after migrations 001–008. All fixture
-- changes roll back. Any error before the final PASS means verification failed.
begin;
create function pg_temp.expect_skill_error(statement text,expected text) returns void
language plpgsql security invoker as $$
begin
 begin execute statement;
 exception when others then if sqlstate<>expected then raise exception 'Expected %, got %: %',expected,sqlstate,sqlerrm;end if;return;end;
 raise exception 'Unexpected success: %',statement;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('b1111111-1111-1111-1111-111111111111','skills-gm@example.invalid',now()),
 ('b2222222-2222-2222-2222-222222222222','skills-player@example.invalid',now()),
 ('b3333333-3333-3333-3333-333333333333','skills-other@example.invalid',now());
select set_config('dcc_test.s_profile','{"version":1,"pronouns":"","method":"array","initialStats":{"strength":2,"intelligence":6,"constitution":3,"dexterity":5,"charisma":4},"stats":{"strength":{"base":2,"enhanced":2},"intelligence":{"base":6,"enhanced":6},"constitution":{"base":3,"enhanced":3},"dexterity":{"base":5,"enhanced":5},"charisma":{"base":4,"enhanced":4}},"backgrounds":{"childhood":{"category":"childhood-1","skills":["Streetwise","Perception"]},"adolescence":{"category":"adolescence-1","skills":["Fabricate","Tracking"]},"career":{"category":"career-2","skills":["Dagger","Endurance"]},"hobby":{"category":"hobby-8","skills":["Driving","Repair"]}},"combatId":"fire-fingers","notes":{"trauma":"","looseEnds":"","regret":"","gear":""},"mana":6,"favor":1}',true);
select set_config('dcc_test.s_zero','{"strength":0,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0,"dr":0,"evade":0}',true);
create function pg_temp.s_act(op text,slot integer default null,kind text default null,target text default null,place text default null,bonuses jsonb default null,baseline jsonb default null,amount bigint default 0) returns void
language plpgsql security invoker as $$
begin perform public.dcc_loadout_action(current_setting('dcc_test.s_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),op,slot,kind,target,place,bonuses,baseline,amount);end $$;
create function pg_temp.s_inventory(op text,item uuid default null,payload jsonb default null,place text default null) returns void
language plpgsql security invoker as $$
begin perform public.dcc_inventory_action(current_setting('dcc_test.s_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),op,item,payload,place);end $$;
create function pg_temp.s_resource(op text,amount bigint default 0,stats jsonb default null) returns void
language plpgsql security invoker as $$
begin perform public.dcc_tutorial_action(current_setting('dcc_test.s_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),op,amount,stats);end $$;
create function pg_temp.s_skill(op text,skill text default null,definition jsonb default null,marked boolean default null,confirmed boolean default false,advancement_window text default null,die integer default null,modifier integer default 0) returns void
language plpgsql security invoker as $$ begin perform public.dcc_skill_action(current_setting('dcc_test.s_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),op,skill,definition,marked,confirmed,advancement_window,die,modifier);end $$;
create function pg_temp.s_get(skill text) returns jsonb language sql security invoker as $$ select value from public.dcc_crawlers,lateral jsonb_array_elements(learned_skills) where id=current_setting('dcc_test.s_crawler')::uuid and value->>'id'=skill $$;
create function pg_temp.s_assert(ok boolean,message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception '%',message;end if;end $$;
create function pg_temp.s_definition(name text,kind text default 'skill',rank integer default 1,cap integer default 15) returns jsonb language sql as $$ select jsonb_build_object('name',name,'kind',kind,'rank',rank,'maxRank',cap,'stat','intelligence','passive',false,'advancement','normal','manaCost',case when kind='spell' then 2 else null end,'description','Test definition','reference','GM reviewed','damage','','range','') $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','b1111111-1111-1111-1111-111111111111',true);
select set_config('dcc_test.s_game',public.dcc_host_game('Skills first game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.s_game')::uuid,'b2222222-2222-2222-2222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.s_game')::uuid,'b3333333-3333-3333-3333-333333333333');
select set_config('dcc_test.s_other_game',public.dcc_host_game('Skills second game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.s_other_game')::uuid,'b2222222-2222-2222-2222-222222222222');
select set_config('request.jwt.claim.sub','b2222222-2222-2222-2222-222222222222',true);
select public.dcc_save_profile(1,'Wizard',current_setting('dcc_test.s_profile')::jsonb);
select set_config('dcc_test.s_profile_version',(select version::text from public.dcc_crawler_profiles where slot=1),true);
select public.dcc_use_crawler_profile(current_setting('dcc_test.s_game')::uuid,1,current_setting('dcc_test.s_profile_version')::uuid);
select public.dcc_use_crawler_profile(current_setting('dcc_test.s_other_game')::uuid,1,current_setting('dcc_test.s_profile_version')::uuid);
select set_config('dcc_test.s_crawler',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.s_game')::uuid),true);
select set_config('dcc_test.s_potion',(select inventory->0->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.s_assert((select jsonb_array_length(learned_skills)=11 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Starting abilities did not seed exactly once.');
select pg_temp.s_assert(pg_temp.s_get('heal')->>'rank'='1' and pg_temp.s_get('heal')->>'advancement'='none','Heal definition incorrect.');
select pg_temp.s_skill('mark','streetwise',null,true);
select pg_temp.s_assert(pg_temp.s_get('streetwise')->>'marked'='true' and pg_temp.s_get('streetwise')->>'rank'='1','Player mark changed rank.');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''advance'',''streetwise'',null,null,false,''two-hour'',20)','42501');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''learn'',null,pg_temp.s_definition(''Forbidden''))','42501');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''learn-catalog'',''aiming'',''{"rank":1}'')','42501');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''edit'',''streetwise'',pg_temp.s_definition(''Streetwise''))','42501');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''remove'',''streetwise'',null,null,true)','42501');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''mark'',''heal'',null,true)','22023');
select pg_temp.expect_skill_error('update public.dcc_crawlers set learned_skills=''[]''::jsonb','42501');
-- Neither another member nor an outsider can mutate this crawler.
select set_config('request.jwt.claim.sub','b3333333-3333-3333-3333-333333333333',true);
select pg_temp.expect_skill_error('select pg_temp.s_skill(''mark'',''streetwise'',null,false)','42501');
select pg_temp.s_assert(not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Other player can read crawler.');
select set_config('request.jwt.claim.sub','b1111111-1111-1111-1111-111111111111',true);
select pg_temp.s_skill('advance','streetwise',null,null,false,'two-hour',1);
select pg_temp.s_assert(pg_temp.s_get('streetwise')->>'rank'='2' and pg_temp.s_get('streetwise')->>'marked'='false','Successful advancement failed.');
select pg_temp.s_skill('mark','streetwise',null,true);
select pg_temp.s_skill('advance','streetwise',null,null,false,'two-hour',1);
select pg_temp.s_assert(pg_temp.s_get('streetwise')->>'rank'='2' and pg_temp.s_get('streetwise')->>'marked'='false' and pg_temp.s_get('streetwise')#>>'{lastAdvancement,die}'='1','Failed advancement must clear mark.');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''advance'',''streetwise'',null,null,false,''two-hour'',20)','22023');
-- Rank boundaries, actual window selection, and replay protection.
select pg_temp.s_skill('edit','streetwise',pg_temp.s_definition('Streetwise','skill',4));
select pg_temp.s_skill('mark','streetwise',null,true);
select pg_temp.expect_skill_error('select pg_temp.s_skill(''advance'',''streetwise'',null,null,false,''floor-end'',20)','22023');
select pg_temp.s_skill('advance','streetwise',null,null,false,'two-hour',4);
select pg_temp.s_skill('mark','streetwise',null,true);
select pg_temp.expect_skill_error('select pg_temp.s_skill(''advance'',''streetwise'',null,null,false,''two-hour'',20)','22023');
select set_config('dcc_test.s_stale',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.s_skill('advance','streetwise',null,null,false,'floor-end',3,2);
select pg_temp.s_assert(pg_temp.s_get('streetwise')->>'rank'='6','Reviewed modifier not applied.');
select pg_temp.expect_skill_error(format('select public.dcc_skill_action(%L,%L,''mark'',''streetwise'',null,true)',current_setting('dcc_test.s_crawler'),current_setting('dcc_test.s_stale')),'40001');
select pg_temp.s_skill('edit','streetwise',pg_temp.s_definition('Streetwise','skill',14));select pg_temp.s_skill('mark','streetwise',null,true);select pg_temp.s_skill('advance','streetwise',null,null,false,'floor-end',14);
select pg_temp.s_assert(pg_temp.s_get('streetwise')->>'rank'='15','Rank 14 did not reach 15.');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''mark'',''streetwise'',null,true)','22023');
-- GM may record magical rank awards above 15, but ordinary marks stop at 15.
select pg_temp.s_skill('edit','streetwise',pg_temp.s_definition('Streetwise','skill',20,20));
select pg_temp.expect_skill_error('select pg_temp.s_skill(''mark'',''streetwise'',null,true)','22023');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''edit'',''streetwise'',pg_temp.s_definition(''Streetwise'',''skill'',21,21))','22023');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''learn'',null,pg_temp.s_definition('' STREETWISE ''))','22023');
-- Protected Heal cannot be removed, edited or impersonated.
select pg_temp.expect_skill_error('select pg_temp.s_skill(''edit'',''heal'',pg_temp.s_definition(''Heal'',''spell''))','22023');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''remove'',''heal'',null,null,true)','22023');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''learn'',null,pg_temp.s_definition(''Heal'',''spell''))','22023');
-- Catalog awards use authoritative metadata and fresh IDs.
select pg_temp.s_skill('learn-catalog','aiming','{"rank":2,"passive":false,"advancement":"normal"}');
select set_config('dcc_test.s_aiming',(select value->>'id' from public.dcc_crawlers,lateral jsonb_array_elements(learned_skills) where id=current_setting('dcc_test.s_crawler')::uuid and value->>'name'='Aiming'),true);
select pg_temp.s_assert(pg_temp.s_get(current_setting('dcc_test.s_aiming'))->>'passive'='true' and pg_temp.s_get(current_setting('dcc_test.s_aiming'))->>'advancement'='special','Catalog metadata was forged.');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''mark'',current_setting(''dcc_test.s_aiming''),null,true)','22023');
select pg_temp.s_skill('mark',current_setting('dcc_test.s_aiming'),null,true,true);
select pg_temp.s_assert(pg_temp.s_get(current_setting('dcc_test.s_aiming'))->>'marked'='true','Special qualifying mark rejected.');
select pg_temp.s_skill('learn-catalog','catcher','{"rank":1}');
select set_config('dcc_test.s_catcher',(select value->>'id' from public.dcc_crawlers,lateral jsonb_array_elements(learned_skills) where id=current_setting('dcc_test.s_crawler')::uuid and value->>'name'='Catcher'),true);
select pg_temp.expect_skill_error('select pg_temp.s_skill(''mark'',current_setting(''dcc_test.s_catcher''),null,true,true)','22023');
-- Custom automation is never accepted; Mana/marks commit together without target damage.
select pg_temp.s_skill('learn',null,pg_temp.s_definition('Custom Spark','spell')||'{"automation":"tutorial-heal"}');
select set_config('dcc_test.s_spark',(select value->>'id' from public.dcc_crawlers,lateral jsonb_array_elements(learned_skills) where id=current_setting('dcc_test.s_crawler')::uuid and value->>'name'='Custom Spark'),true);
select pg_temp.s_assert(pg_temp.s_get(current_setting('dcc_test.s_spark'))->>'automation'='manual','Custom automation was trusted.');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''cast'',current_setting(''dcc_test.s_spark''),null,null,true)','22023');
select pg_temp.s_act('assign',4,'skill',current_setting('dcc_test.s_spark'));
select set_config('request.jwt.claim.sub','b2222222-2222-2222-2222-222222222222',true);
select pg_temp.s_skill('cast',current_setting('dcc_test.s_spark'),null,null,true);
select pg_temp.s_assert((select tutorial_profile->>'mana'='4' and current_segments=10 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid) and pg_temp.s_get(current_setting('dcc_test.s_spark'))->>'marked'='true','Spell cast not atomic.');
select pg_temp.s_act('use',4);select pg_temp.s_act('use',4);
select set_config('dcc_test.s_before',(select row_to_json(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.expect_skill_error('select pg_temp.s_act(''use'',4)','22023');
select pg_temp.s_assert((select row_to_json(c)::text=current_setting('dcc_test.s_before') from public.dcc_crawlers c where id=current_setting('dcc_test.s_crawler')::uuid),'Failed cast partially changed crawler.');
-- Other game instances and the saved starting writeup remain independent.
select pg_temp.s_assert((select tutorial_profile->>'mana'='6' and jsonb_array_length(learned_skills)=11 from public.dcc_crawlers where campaign_id=current_setting('dcc_test.s_other_game')::uuid),'Ability changes leaked across games.');
select pg_temp.s_assert((select version::text=current_setting('dcc_test.s_profile_version') from public.dcc_crawler_profiles where slot=1),'Ability changes altered account writeup.');
select pg_temp.s_resource('mana-recover',6);
select pg_temp.s_resource('damage',10000);
select pg_temp.expect_skill_error('select pg_temp.s_act(''use'',4)','22023');
select pg_temp.s_resource('heal-slots',10);
select pg_temp.s_resource('damage',6);
select pg_temp.s_act('use',1);
select pg_temp.s_assert((select tutorial_profile->>'mana'='4' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid) and pg_temp.s_get('heal')->>'rank'='1' and pg_temp.s_get('heal')->>'marked'='false','Prepared Heal broken.');
-- Resource and equipment recalculations preserve the learned records.
select pg_temp.s_assert(pg_temp.s_get('streetwise')->>'rank'='20' and pg_temp.s_get(current_setting('dcc_test.s_spark'))->>'marked'='true','Resource write reset learned ranks/marks.');
select set_config('request.jwt.claim.sub','b1111111-1111-1111-1111-111111111111',true);
select pg_temp.s_skill('edit',current_setting('dcc_test.s_spark'),pg_temp.s_definition('Custom Spark','skill'));
select pg_temp.s_assert((select hotlist->3='null'::jsonb from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Changing Spell kind left stale Hotlist reference.');
select pg_temp.s_act('assign',4,'skill','fire-fingers');
select pg_temp.s_skill('remove','fire-fingers',null,null,true);
select pg_temp.s_assert((select hotlist->3='null'::jsonb from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Removing Spell left stale Hotlist reference.');
select pg_temp.expect_skill_error('select pg_temp.s_act(''assign'',4,''skill'',''fire-fingers'')','22023');
reset role;
select 'PASS: learned abilities, advancement, casting, ownership, versioning, cleanup, and isolation' as result;
rollback;
