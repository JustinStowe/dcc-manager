-- Run as administrator after migration 015. Fixtures and all changes roll back.
begin;
create function pg_temp.a_assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%',message;end if;end $$;
create function pg_temp.a_error(statement text, expected text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when others then
  if sqlstate<>expected then raise exception 'Expected %, got %: %',expected,sqlstate,sqlerrm;end if;return;
 end;
 raise exception 'Unexpected success: %',statement;
end $$;
create function pg_temp.a_act(op text,payload jsonb) returns void language plpgsql as $$
begin perform public.dcc_advancement_action(current_setting('dcc_test.a_crawler')::uuid,
 (select version from public.dcc_crawlers where id=current_setting('dcc_test.a_crawler')::uuid),op,payload);end $$;
create function pg_temp.a_sheet(op text,payload jsonb) returns void language plpgsql as $$
begin perform public.dcc_sheet_action(current_setting('dcc_test.a_crawler')::uuid,
 (select version from public.dcc_crawlers where id=current_setting('dcc_test.a_crawler')::uuid),op,payload);end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('a1511111-1111-4111-8111-111111111111','advancement-gm@example.invalid',now()),
 ('a1522222-2222-4222-8222-222222222222','advancement-player@example.invalid',now()),
 ('a1533333-3333-4333-8333-333333333333','advancement-other@example.invalid',now());
select set_config('dcc_test.a_profile','{"version":1,"pronouns":"","method":"array","initialStats":{"strength":2,"intelligence":6,"constitution":3,"dexterity":5,"charisma":4},"stats":{"strength":{"base":2,"enhanced":2},"intelligence":{"base":6,"enhanced":6},"constitution":{"base":3,"enhanced":3},"dexterity":{"base":5,"enhanced":5},"charisma":{"base":4,"enhanced":4}},"backgrounds":{"childhood":{"category":"childhood-1","skills":["Streetwise","Perception"]},"adolescence":{"category":"adolescence-1","skills":["Fabricate","Tracking"]},"career":{"category":"career-2","skills":["Dagger","Endurance"]},"hobby":{"category":"hobby-8","skills":["Driving","Repair"]}},"combatId":"fire-fingers","notes":{"trauma":"","looseEnds":"","regret":"","gear":""},"mana":6,"favor":1}',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','a1511111-1111-4111-8111-111111111111',true);
select set_config('dcc_test.a_game',public.dcc_host_game('Advancement test')::text,true);
select public.dcc_add_player(current_setting('dcc_test.a_game')::uuid,'a1522222-2222-4222-8222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.a_game')::uuid,'a1533333-3333-4333-8333-333333333333');
select set_config('dcc_test.a_other_game',public.dcc_host_game('Independent game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.a_other_game')::uuid,'a1522222-2222-4222-8222-222222222222');
select set_config('request.jwt.claim.sub','a1522222-2222-4222-8222-222222222222',true);
select public.dcc_save_profile(1,'Crawler',current_setting('dcc_test.a_profile')::jsonb);
select public.dcc_use_crawler_profile(current_setting('dcc_test.a_game')::uuid,1,(select version from public.dcc_crawler_profiles where slot=1));
select public.dcc_use_crawler_profile(current_setting('dcc_test.a_other_game')::uuid,1,(select version from public.dcc_crawler_profiles where slot=1));
select set_config('dcc_test.a_crawler',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.a_game')::uuid),true);
select set_config('dcc_test.a_writeup',(select version::text from public.dcc_crawler_profiles where slot=1),true);
select pg_temp.a_assert((select advancement='{"reconciled":true,"spent":0,"authorized":0,"humanFavor":false}'::jsonb from public.dcc_crawlers where id=current_setting('dcc_test.a_crawler')::uuid),'New crawler does not start ready at zero.');
reset role;
-- Simulate an existing crawler with manual gains and an over-cap metadata level.
do $$ begin
 if to_regprocedure('public.dcc_third_floor_action(uuid,uuid,text,jsonb)') is not null then
  execute format('update public.dcc_crawlers set third_floor=''{"reviewed":false,"offers":[],"selected":null}'' where id=%L',current_setting('dcc_test.a_crawler'));
 end if;
end $$;
update public.dcc_crawlers set crawler_level=300,advancement='{"reconciled":false,"spent":0,"authorized":0,"humanFavor":false}',
 stat_baseline=jsonb_set(stat_baseline,'{strength,base}','14'),current_segments=0,tutorial_profile=jsonb_set(tutorial_profile,'{mana}','2')
 where id=current_setting('dcc_test.a_crawler')::uuid;
select set_config('dcc_test.a_before',(select (to_jsonb(c)-'version'-'crawler_level'-'advancement')::text from public.dcc_crawlers c where id=current_setting('dcc_test.a_crawler')::uuid),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','a1522222-2222-4222-8222-222222222222',true);
select pg_temp.a_error('select pg_temp.a_act(''reconcile'',''{"level":9,"spent":12,"confirmed":true,"reason":"Review"}'')','42501');
select pg_temp.a_error('select pg_temp.a_act(''award'',''{"amount":1,"source":"quest","reason":"Quest"}'')','42501');
select pg_temp.a_error('select pg_temp.a_act(''authorize'',''{"amount":3,"saferoom":true,"reason":"Room"}'')','42501');
select pg_temp.a_error('select pg_temp.a_act(''human-benefit'',''{"enabled":true,"confirmed":true,"reason":"Human"}'')','42501');
select pg_temp.a_error('select pg_temp.a_act(''allocate'',''{"allocation":{"strength":1,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0}}'')','22023');
select set_config('request.jwt.claim.sub','a1511111-1111-4111-8111-111111111111',true);
select pg_temp.a_error('select pg_temp.a_act(''award'',''{"amount":1,"source":"quest","reason":"Quest"}'')','22023');
select pg_temp.a_error('select pg_temp.a_act(''reconcile'',''{"level":251,"spent":0,"confirmed":true,"reason":"Review"}'')','22023');
select pg_temp.a_error('select pg_temp.a_act(''reconcile'',''{"level":9,"spent":25,"confirmed":true,"reason":"Review"}'')','22023');
select pg_temp.a_error('select pg_temp.a_act(''reconcile'',''{"level":9,"spent":12,"reason":"Review"}'')','22023');
select pg_temp.a_act('reconcile','{"level":9,"spent":12,"confirmed":true,"reason":"12 points already reflected in manual Strength gains"}');
select pg_temp.a_assert((select crawler_level=9 and advancement->>'spent'='12' and advancement->>'authorized'='0'
 and to_jsonb(c)-'version'-'crawler_level'-'advancement'=current_setting('dcc_test.a_before')::jsonb from public.dcc_crawlers c where id=current_setting('dcc_test.a_crawler')::uuid),'Reconciliation changed existing stats/resources or entitlement.');
select pg_temp.a_error('select pg_temp.a_act(''reconcile'',''{"level":9,"spent":0,"confirmed":true,"reason":"Repeat"}'')','22023');
select pg_temp.a_error('select pg_temp.a_sheet(''level'',''{"value":10}'')','22023');
select pg_temp.a_error('select dcc_private.sheet_before_advancement(null,null,''level'',''{}'')','42501');
select pg_temp.a_error('select pg_temp.a_act(''authorize'',''{"amount":1,"saferoom":true,"reason":"Tutorial floor"}'')','22023');
select pg_temp.a_error('select pg_temp.a_act(''human-benefit'',''{"enabled":true,"confirmed":true,"reason":"Tutorial"}'')','22023');
select pg_temp.a_act('award','{"amount":2,"source":"boss","reason":"Borough boss"}');
select pg_temp.a_assert((select crawler_level=11 and advancement->>'spent'='12' and advancement->>'authorized'='0'
 and tutorial_profile->>'favor'='1' and current_segments=0 from public.dcc_crawlers where id=current_setting('dcc_test.a_crawler')::uuid),'Tutorial award changed spending, resources or health.');
select pg_temp.a_sheet('floor','{"value":3}');
select pg_temp.a_error('select pg_temp.a_act(''authorize'',''{"amount":3,"reason":"No confirmation"}'')','22023');
select pg_temp.a_error('select pg_temp.a_act(''authorize'',''{"amount":19,"saferoom":true,"reason":"Too many"}'')','22023');
select pg_temp.a_act('authorize','{"amount":6,"saferoom":true,"reason":"Saferoom arrived"}');
select pg_temp.a_act('award','{"amount":1,"source":"two-hour","reason":"Session interval"}');
select pg_temp.a_assert((select advancement->>'authorized'='6' from public.dcc_crawlers where id=current_setting('dcc_test.a_crawler')::uuid),'Later awards automatically authorized new points.');
-- A tracked effect remains active and is included exactly once after allocation.
select public.dcc_effect_action(current_setting('dcc_test.a_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.a_crawler')::uuid),'add',
 '{"definition":{"name":"Int buff","kind":"buff","source":"Test","notes":"","active":true,"remainingRounds":null,"modifiers":{"strength":0,"intelligence":2,"constitution":0,"dexterity":0,"charisma":0},"defenses":{}}}');
select set_config('dcc_test.a_stale',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.a_crawler')::uuid),true);
select set_config('request.jwt.claim.sub','a1522222-2222-4222-8222-222222222222',true);
select pg_temp.a_error('select pg_temp.a_act(''allocate'',''{"allocation":{"strength":6,"intelligence":1,"constitution":0,"dexterity":0,"charisma":0}}'')','22023');
select pg_temp.a_error('select pg_temp.a_act(''allocate'',''{"allocation":{"strength":-1,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0}}'')','22023');
select pg_temp.a_error('select pg_temp.a_act(''allocate'',''{"allocation":{"strength":0,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0}}'')','22023');
select pg_temp.a_act('allocate','{"allocation":{"strength":2,"intelligence":1,"constitution":0,"dexterity":0,"charisma":0},"authorized":999,"mana":999}');
select pg_temp.a_assert((select stat_baseline#>>'{strength,base}'='16' and tutorial_profile#>>'{stats,intelligence,enhanced}'='9'
 and advancement->>'spent'='15' and advancement->>'authorized'='3' and tutorial_profile->>'mana'='2' and current_segments=0
 from public.dcc_crawlers where id=current_setting('dcc_test.a_crawler')::uuid),'Allocation did not atomically spend points, derive effects, or preserve resources.');
select pg_temp.a_error(format('select public.dcc_advancement_action(%L,%L,''allocate'',''{"allocation":{"strength":1,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0}}'')',current_setting('dcc_test.a_crawler'),current_setting('dcc_test.a_stale')),'40001');
select pg_temp.a_error('update public.dcc_crawlers set advancement=''{}''','42501');
select pg_temp.a_error('delete from public.dcc_advancement_history','42501');
select pg_temp.a_error('insert into public.dcc_advancement_history(campaign_id) values(null)','42501');
select pg_temp.a_assert((select count(*)>0 from public.dcc_advancement_history where crawler_id=current_setting('dcc_test.a_crawler')::uuid),'Owner cannot see advancement history.');
select pg_temp.a_assert((select version::text=current_setting('dcc_test.a_writeup') from public.dcc_crawler_profiles where slot=1),'Advancement changed saved account writeup.');
select pg_temp.a_assert((select crawler_level=1 and advancement->>'spent'='0' and tutorial_profile=current_setting('dcc_test.a_profile')::jsonb from public.dcc_crawlers where campaign_id=current_setting('dcc_test.a_other_game')::uuid),'Advancement leaked to another game.');
select set_config('request.jwt.claim.sub','a1533333-3333-4333-8333-333333333333',true);
select pg_temp.a_assert(not exists(select 1 from public.dcc_advancement_history),'Other player can read advancement history.');
select pg_temp.a_error(format('select public.dcc_advancement_action(%L,%L,''award'',''{"amount":1,"source":"quest","reason":"Test"}'')',current_setting('dcc_test.a_crawler'),current_setting('dcc_test.a_stale')),'42501');
select set_config('request.jwt.claim.sub','a1511111-1111-4111-8111-111111111111',true);
do $$ begin
 if to_regprocedure('public.dcc_third_floor_action(uuid,uuid,text,jsonb)') is not null then
  perform public.dcc_third_floor_action(current_setting('dcc_test.a_crawler')::uuid,
   (select version from public.dcc_crawlers where id=current_setting('dcc_test.a_crawler')::uuid),'review',
   '{"mode":"existing","raceId":"human","classId":"fighter","confirmed":true,"reason":"Existing Human benefits reviewed for advancement regression"}');
 else perform pg_temp.a_act('human-benefit','{"enabled":true,"confirmed":true,"reason":"Selected Human on Third Floor"}');end if;
end $$;
select pg_temp.a_act('award','{"amount":2,"source":"quest","reason":"Quest completed"}');
select pg_temp.a_assert((select crawler_level=14 and tutorial_profile->>'favor'='3' from public.dcc_crawlers where id=current_setting('dcc_test.a_crawler')::uuid),'Selected Human Favor not applied per gained level.');
select pg_temp.a_sheet('floor','{"value":4}');
select pg_temp.a_assert((select advancement->>'authorized'='0' from public.dcc_crawlers where id=current_setting('dcc_test.a_crawler')::uuid),'Floor change did not revoke saferoom spending.');
select pg_temp.a_act('authorize','{"amount":3,"saferoom":true,"reason":"New saferoom"}');
select pg_temp.a_act('authorize','{"amount":0,"reason":"Leaving room"}');
select pg_temp.a_error('select pg_temp.a_act(''allocate'',''{"allocation":{"strength":1,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0}}'')','22023');
do $$ begin
 if to_regprocedure('public.dcc_third_floor_action(uuid,uuid,text,jsonb)') is not null then
  perform pg_temp.a_error('select pg_temp.a_act(''human-benefit'',''{"enabled":false,"confirmed":true,"reason":"Retired toggle"}'')','22023');
 else perform pg_temp.a_act('human-benefit','{"enabled":false,"confirmed":true,"reason":"Benefit disabled"}');end if;
end $$;
select pg_temp.a_error('select pg_temp.a_act(''award'',''{"amount":237,"source":"other","reason":"Exceeds cap"}'')','22023');
select pg_temp.a_act('award','{"amount":236,"source":"other","reason":"Cap boundary test"}');
select pg_temp.a_error('select pg_temp.a_act(''award'',''{"amount":1,"source":"quest","reason":"Beyond cap"}'')','22023');
select pg_temp.a_assert((select crawler_level=250 and tutorial_profile->>'favor'=(case when to_regprocedure('public.dcc_third_floor_action(uuid,uuid,text,jsonb)') is not null then '239' else '3' end) from public.dcc_crawlers where id=current_setting('dcc_test.a_crawler')::uuid),'Cap or selected Human benefit failed.');
select pg_temp.a_assert((select count(*)=3 from public.dcc_advancement_history where crawler_id=current_setting('dcc_test.a_crawler')::uuid and operation='authorize' and details->>'previousAuthorized' is null),'Authorization history missing.');
reset role;
-- A derived equipment overflow must roll back the balance, version, resources and history together.
update public.dcc_crawlers set stat_baseline=jsonb_set(stat_baseline,'{strength,base}','9999'),
 inventory=inventory||'[{"id":"a1544444-4444-4444-8444-444444444444","name":"Strength hat","kind":"gear","quantity":1,"notes":"","gearSlot":"head","location":"head","effect":"manual","bonuses":{"strength":1,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0,"dr":0,"evade":0}}]'::jsonb,
 advancement=jsonb_set(advancement,'{authorized}','3') where id=current_setting('dcc_test.a_crawler')::uuid;
select set_config('dcc_test.a_atomic',(select to_jsonb(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.a_crawler')::uuid),true);
select set_config('dcc_test.a_history',(select count(*)::text from public.dcc_advancement_history),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','a1522222-2222-4222-8222-222222222222',true);
select pg_temp.a_error('select pg_temp.a_act(''allocate'',''{"allocation":{"strength":1,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0}}'')','22023');
select pg_temp.a_assert((select to_jsonb(c)=current_setting('dcc_test.a_atomic')::jsonb from public.dcc_crawlers c where id=current_setting('dcc_test.a_crawler')::uuid),'Derived failure changed the crawler.');
select pg_temp.a_assert((select count(*)::text=current_setting('dcc_test.a_history') from public.dcc_advancement_history),'Failed allocation wrote history.');
reset role;
do $$ begin
 if has_function_privilege('anon','public.dcc_advancement_action(uuid,uuid,text,jsonb)','EXECUTE')
  or has_table_privilege('authenticated','public.dcc_advancement_history','INSERT')
  or has_function_privilege('authenticated','dcc_private.sheet_before_advancement(uuid,uuid,text,jsonb)','EXECUTE') then
  raise exception 'Advancement privileges are too broad.';
 end if;
end $$;
select 'PASS: advancement reconciliation, roles, point conservation, concurrency, Human Favor, floor gating and isolation' as result;
rollback;
