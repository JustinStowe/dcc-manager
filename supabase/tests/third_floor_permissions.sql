-- Run as administrator after migration 018. All fixtures and writes roll back.
begin;
create function pg_temp.tf_assert(ok boolean,message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception '%',message;end if;end $$;
create function pg_temp.tf_error(statement text,expected text) returns void language plpgsql as $$
begin begin execute statement;exception when others then if sqlstate<>expected then raise exception 'Expected %, got %: %',expected,sqlstate,sqlerrm;end if;return;end;raise exception 'Unexpected success: %',statement;end $$;
create function pg_temp.tf_act(op text,payload jsonb) returns void language plpgsql as $$
begin perform public.dcc_third_floor_action(current_setting('dcc_test.tf_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.tf_crawler')::uuid),op,payload);end $$;
create function pg_temp.tf_sheet(op text,payload jsonb) returns void language plpgsql as $$
begin perform public.dcc_sheet_action(current_setting('dcc_test.tf_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.tf_crawler')::uuid),op,payload);end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('b1811111-1111-4111-8111-111111111111','selection-gm@example.invalid',now()),
 ('b1822222-2222-4222-8222-222222222222','selection-player@example.invalid',now()),
 ('b1833333-3333-4333-8333-333333333333','selection-other@example.invalid',now());
select set_config('dcc_test.tf_profile','{"version":1,"pronouns":"","method":"array","initialStats":{"strength":2,"intelligence":6,"constitution":3,"dexterity":5,"charisma":4},"stats":{"strength":{"base":2,"enhanced":2},"intelligence":{"base":6,"enhanced":6},"constitution":{"base":3,"enhanced":3},"dexterity":{"base":5,"enhanced":5},"charisma":{"base":4,"enhanced":4}},"backgrounds":{"childhood":{"category":"childhood-1","skills":["Streetwise","Perception"]},"adolescence":{"category":"adolescence-1","skills":["Fabricate","Tracking"]},"career":{"category":"career-2","skills":["Dagger","Endurance"]},"hobby":{"category":"hobby-8","skills":["Driving","Repair"]}},"combatId":"fire-fingers","notes":{"trauma":"","looseEnds":"","regret":"","gear":""},"mana":6,"favor":1}',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','b1811111-1111-4111-8111-111111111111',true);
select set_config('dcc_test.tf_game',public.dcc_host_game('Selection test')::text,true);
select set_config('dcc_test.tf_legacy_game',public.dcc_host_game('Existing benefits')::text,true);
select set_config('dcc_test.tf_stress_game',public.dcc_host_game('Atomic selection test')::text,true);
select public.dcc_add_player(current_setting('dcc_test.tf_game')::uuid,'b1822222-2222-4222-8222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.tf_game')::uuid,'b1833333-3333-4333-8333-333333333333');
select public.dcc_add_player(current_setting('dcc_test.tf_legacy_game')::uuid,'b1822222-2222-4222-8222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.tf_stress_game')::uuid,'b1822222-2222-4222-8222-222222222222');
select set_config('request.jwt.claim.sub','b1822222-2222-4222-8222-222222222222',true);
select public.dcc_save_profile(1,'Crawler',current_setting('dcc_test.tf_profile')::jsonb);
select public.dcc_use_crawler_profile(current_setting('dcc_test.tf_game')::uuid,1,(select version from public.dcc_crawler_profiles where slot=1));
select public.dcc_use_crawler_profile(current_setting('dcc_test.tf_legacy_game')::uuid,1,(select version from public.dcc_crawler_profiles where slot=1));
select public.dcc_use_crawler_profile(current_setting('dcc_test.tf_stress_game')::uuid,1,(select version from public.dcc_crawler_profiles where slot=1));
select set_config('dcc_test.tf_main',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.tf_game')::uuid),true);
select set_config('dcc_test.tf_legacy',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.tf_legacy_game')::uuid),true);
select set_config('dcc_test.tf_stress',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.tf_stress_game')::uuid),true);
select set_config('dcc_test.tf_writeup',(select to_jsonb(p)::text from public.dcc_crawler_profiles p where slot=1),true);
select pg_temp.tf_assert((select third_floor='{"reviewed":true,"offers":[],"selected":null}'::jsonb from public.dcc_crawlers where id=current_setting('dcc_test.tf_main')::uuid),'New crawler needs an unnecessary legacy review.');
reset role;
-- Existing Human flag and manually applied bonuses must survive migration/review.
update public.dcc_crawlers set third_floor='{"reviewed":false,"offers":[],"selected":null}',dungeon_floor=3,
 advancement=jsonb_set(advancement,'{humanFavor}','true'),crawler_level=9,current_segments=3,
 stat_baseline=(select jsonb_object_agg(key,value||jsonb_build_object('base',(value->>'base')::integer+2)) from jsonb_each(stat_baseline)),
 tutorial_profile=jsonb_set(tutorial_profile,'{mana}','2') where id=current_setting('dcc_test.tf_legacy')::uuid;
select set_config('dcc_test.tf_before',(select (to_jsonb(c)-'third_floor'-'version')::text from public.dcc_crawlers c where id=current_setting('dcc_test.tf_legacy')::uuid),true);
select set_config('dcc_test.tf_main_before',(select to_jsonb(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.tf_main')::uuid),true);
set local role authenticated;
select set_config('dcc_test.tf_crawler',current_setting('dcc_test.tf_legacy'),true);
select pg_temp.tf_error('select pg_temp.tf_act(''review'',''{"mode":"none","confirmed":true,"reason":"Forge review"}'')','42501');
select set_config('request.jwt.claim.sub','b1811111-1111-4111-8111-111111111111',true);
select pg_temp.tf_error('select pg_temp.tf_act(''review'',''{"mode":"none","confirmed":true,"reason":"Would erase Human benefit"}'')','22023');
select pg_temp.tf_error('select pg_temp.tf_act(''review'',''{"mode":"existing","raceId":"human","classId":"fighter","reason":"No confirmation"}'')','22023');
select pg_temp.tf_act('review','{"mode":"existing","raceId":"human","classId":"manual","className":"Existing Dungeon Dad","move":25,"step":10,"confirmed":true,"reason":"All existing bonuses already included"}');
select pg_temp.tf_assert((select third_floor#>>'{selected,mode}'='reconciled' and third_floor#>>'{selected,className}'='Existing Dungeon Dad'
 and to_jsonb(c)-'third_floor'-'version'=current_setting('dcc_test.tf_before')::jsonb from public.dcc_crawlers c where id=current_setting('dcc_test.tf_legacy')::uuid),'Reconciliation changed existing benefits/resources.');
select pg_temp.tf_assert((select to_jsonb(c)=current_setting('dcc_test.tf_main_before')::jsonb from public.dcc_crawlers c where id=current_setting('dcc_test.tf_main')::uuid),'Reconciliation leaked to another game.');
select public.dcc_advancement_action(current_setting('dcc_test.tf_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.tf_crawler')::uuid),'award','{"amount":1,"source":"quest","reason":"Future Human Favor"}');
select pg_temp.tf_assert((select tutorial_profile->>'favor'='2' and crawler_level=10 from public.dcc_crawlers where id=current_setting('dcc_test.tf_crawler')::uuid),'Selected Human did not gain Favor on future award.');
select pg_temp.tf_error('select pg_temp.tf_act(''review'',''{"mode":"none","confirmed":true,"reason":"Repeat"}'')','22023');
select pg_temp.tf_error(format('select public.dcc_advancement_action(%L,(select version from public.dcc_crawlers where id=%L),''human-benefit'',''{"enabled":false,"confirmed":true,"reason":"Bypass"}'')',current_setting('dcc_test.tf_crawler'),current_setting('dcc_test.tf_crawler')),'22023');

select set_config('dcc_test.tf_crawler',current_setting('dcc_test.tf_main'),true);
select pg_temp.tf_error('select pg_temp.tf_act(''review'',''{"mode":"none","confirmed":true,"reason":"New crawler repeated review"}'')','22023');
select pg_temp.tf_error('select pg_temp.tf_act(''offer'',''{"offers":["human|fighter"],"confirmed":true,"reason":"Too early"}'')','22023');
select pg_temp.tf_sheet('floor','{"value":3}');
select pg_temp.tf_error('select pg_temp.tf_act(''offer'',''{"offers":["amazonian|fighter"],"confirmed":true,"reason":"Cannot self-qualify"}'')','22023');
select pg_temp.tf_error('select pg_temp.tf_act(''offer'',''{"offers":["human|monster-truck-driver"],"confirmed":true,"reason":"Driving too low"}'')','22023');
select pg_temp.tf_error('select pg_temp.tf_act(''offer'',''{"offers":["pterolykos|pit-fighter"],"confirmed":true,"reason":"Wrong planet"}'')','22023');
select pg_temp.tf_error('select pg_temp.tf_act(''select'',''{"pair":"human|fighter","choices":{"weapon":["bow"],"support":["aiming","catcher"]},"confirmed":true,"reason":"Unoffered"}'')','22023');
reset role;
update public.dcc_crawlers set learned_skills=learned_skills||jsonb_build_array(dcc_private.selection_option('abilities','bow')||'{"rank":8,"marked":true,"origin":"gm"}'::jsonb),
 current_segments=0,tutorial_profile=jsonb_set(tutorial_profile,'{mana}','2'),version=gen_random_uuid() where id=current_setting('dcc_test.tf_main')::uuid;
set local role authenticated;
select pg_temp.tf_act('offer','{"offers":["amazonian|fighter","human|blizzardmancer"],"confirmed":true,"reason":"GM reviewed requirements"}');
select pg_temp.tf_sheet('floor','{"value":4}');
select pg_temp.tf_assert((select third_floor->'offers'='[]'::jsonb from public.dcc_crawlers where id=current_setting('dcc_test.tf_crawler')::uuid),'Floor change did not close selection offers.');
select pg_temp.tf_act('offer','{"offers":["amazonian|fighter","human|blizzardmancer"],"confirmed":true,"reason":"New floor confirmation"}');
select set_config('dcc_test.tf_stale',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.tf_crawler')::uuid),true);
select set_config('request.jwt.claim.sub','b1822222-2222-4222-8222-222222222222',true);
select pg_temp.tf_error('select pg_temp.tf_act(''offer'',''{"offers":[],"confirmed":true,"reason":"Player revoke"}'')','42501');
select pg_temp.tf_error('select pg_temp.tf_act(''select'',''{"pair":"amazonian|fighter","choices":{"weapon":["heal"],"support":["aiming","catcher"]},"confirmed":true,"reason":"Forged benefit"}'')','22023');
select pg_temp.tf_error('select pg_temp.tf_act(''select'',''{"pair":"amazonian|fighter","choices":{"weapon":["bow"],"support":["aiming","aiming"]},"confirmed":true,"reason":"Duplicate choice"}'')','22023');
select pg_temp.tf_act('select','{"pair":"amazonian|fighter","choices":{"weapon":["bow"],"support":["aiming","catcher"]},"confirmed":true,"reason":"Chosen pair","stats":{"strength":9999},"favor":9999}');
select pg_temp.tf_assert((select third_floor#>>'{selected,raceId}'='amazonian' and third_floor#>>'{selected,classId}'='fighter'
 and stat_baseline#>>'{strength,base}'='10' and stat_baseline#>>'{dexterity,base}'='8' and defense_base=2
 and current_segments=0 and tutorial_profile->>'mana'='2' and tutorial_profile->>'favor'='1' and advancement->>'humanFavor'='false'
 from public.dcc_crawlers where id=current_setting('dcc_test.tf_crawler')::uuid),'Selection failed to apply exactly the supported stats or preserved resources.');
select pg_temp.tf_assert((select value->>'rank'='10' from public.dcc_crawlers,lateral jsonb_array_elements(learned_skills) where id=current_setting('dcc_test.tf_crawler')::uuid and value->>'id'='bow'),'Combined Race/Class bonus exceeded or missed Rank 10.');
select pg_temp.tf_assert((select value->>'rank'='1' and value->>'manaCost'='2' from public.dcc_crawlers,lateral jsonb_array_elements(learned_skills) where id=current_setting('dcc_test.tf_crawler')::uuid and value->>'id'='heal'),'Selection modified protected Heal.');
select pg_temp.tf_error('select pg_temp.tf_act(''select'',''{"pair":"amazonian|fighter","choices":{"weapon":["bow"],"support":["aiming","catcher"]},"confirmed":true,"reason":"Repeat"}'')','22023');
select pg_temp.tf_error(format('select public.dcc_third_floor_action(%L,%L,''select'',''{"pair":"human|blizzardmancer","choices":{},"confirmed":true,"reason":"Stale"}'')',current_setting('dcc_test.tf_crawler'),current_setting('dcc_test.tf_stale')),'40001');
select pg_temp.tf_error('update public.dcc_crawlers set third_floor=''{}''','42501');
select pg_temp.tf_error('select dcc_private.selection_option(''races'',''human'')','42501');
select pg_temp.tf_assert((select count(*)>0 from public.dcc_advancement_history where operation='selection-apply'),'Owner cannot read selection history.');
select pg_temp.tf_assert((select to_jsonb(p)=current_setting('dcc_test.tf_writeup')::jsonb from public.dcc_crawler_profiles p where slot=1),'Selection changed the saved account writeup.');
select set_config('request.jwt.claim.sub','b1833333-3333-4333-8333-333333333333',true);
select pg_temp.tf_assert(not exists(select 1 from public.dcc_advancement_history),'Other player can read selection history.');
select pg_temp.tf_error(format('select public.dcc_third_floor_action(%L,%L,''select'',''{"confirmed":true,"reason":"Other player"}'')',current_setting('dcc_test.tf_crawler'),current_setting('dcc_test.tf_stale')),'42501');

-- Trigger failure after computing grants must roll back state, stats, skills, resources and history together.
reset role;
update public.dcc_crawlers set dungeon_floor=3,current_segments=0,tutorial_profile=jsonb_set(tutorial_profile,'{mana}','2'),
 stat_baseline=jsonb_set(stat_baseline,'{intelligence,base}','9998'),
 inventory=inventory||'[{"id":"b1844444-4444-4444-8444-444444444444","name":"Int hat","kind":"gear","quantity":1,"notes":"","gearSlot":"head","location":"head","effect":"manual","bonuses":{"strength":0,"intelligence":1,"constitution":0,"dexterity":0,"charisma":0,"dr":0,"evade":0}}]'::jsonb
 where id=current_setting('dcc_test.tf_stress')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','b1811111-1111-4111-8111-111111111111',true);
select set_config('dcc_test.tf_crawler',current_setting('dcc_test.tf_stress'),true);
select pg_temp.tf_act('offer','{"offers":["igneous|blizzardmancer"],"confirmed":true,"reason":"Overflow boundary"}');
select set_config('dcc_test.tf_atomic',(select to_jsonb(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.tf_crawler')::uuid),true);
select set_config('dcc_test.tf_history',(select count(*)::text from public.dcc_advancement_history),true);
select pg_temp.tf_error('select pg_temp.tf_act(''select'',''{"pair":"igneous|blizzardmancer","choices":{},"confirmed":true,"reason":"Overflow"}'')','22023');
select pg_temp.tf_assert((select to_jsonb(c)=current_setting('dcc_test.tf_atomic')::jsonb from public.dcc_crawlers c where id=current_setting('dcc_test.tf_crawler')::uuid),'Failed selection changed the crawler.');
select pg_temp.tf_assert((select count(*)::text=current_setting('dcc_test.tf_history') from public.dcc_advancement_history),'Failed selection wrote history.');
reset role;
update public.dcc_crawlers set stat_baseline=jsonb_set(stat_baseline,'{intelligence,base}','6') where id=current_setting('dcc_test.tf_stress')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','b1822222-2222-4222-8222-222222222222',true);
select pg_temp.tf_act('select','{"pair":"igneous|blizzardmancer","choices":{},"confirmed":true,"reason":"Final verified choice"}');
select pg_temp.tf_assert((select third_floor#>>'{selected,size}'='5' and stat_baseline#>>'{charisma,base}'='2' and defense_base=3
 and typed_defenses#>>'{Fire,immune}'='true' and typed_defenses#>>'{Ice,resistant}'='true' and typed_defenses#>>'{Ice,vulnerable}'='true'
 and current_segments=0 and tutorial_profile->>'mana'='2' from public.dcc_crawlers where id=current_setting('dcc_test.tf_crawler')::uuid),'Negative stats, size, defenses or resources did not apply correctly.');
select pg_temp.tf_assert((select value->>'rank'='4' and value->>'manaCost'='9' from public.dcc_crawlers,lateral jsonb_array_elements(learned_skills) where id=current_setting('dcc_test.tf_crawler')::uuid and value->>'id'='ice-blast'),'New Spell grant was invalid.');
reset role;
do $$ begin
 if has_function_privilege('anon','public.dcc_third_floor_action(uuid,uuid,text,jsonb)','EXECUTE') or has_function_privilege('authenticated','dcc_private.advancement_before_selection(uuid,uuid,text,jsonb)','EXECUTE') then raise exception 'Selection privileges too broad.';end if;
end $$;
select 'PASS: Race/Class selection, reconciliation, compatibility, choices, rank cap, atomic grants, resources, roles, versions and isolation' as result;
rollback;
