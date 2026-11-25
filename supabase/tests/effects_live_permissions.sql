-- Run the complete script as administrator after migrations 001–012. All fixture
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
 ('e1111111-1111-1111-1111-111111111111','effects-gm@example.invalid',now()),
 ('e2222222-2222-2222-2222-222222222222','effects-player@example.invalid',now()),
 ('e3333333-3333-3333-3333-333333333333','effects-other@example.invalid',now());
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
create function pg_temp.sheet_act(op text,payload jsonb default '{}') returns void language plpgsql security invoker as $$ begin perform public.dcc_sheet_action(current_setting('dcc_test.s_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),op,payload);end $$;
create function pg_temp.fx(op text,payload jsonb default '{}') returns void language plpgsql security invoker as $$ begin perform public.dcc_effect_action(current_setting('dcc_test.s_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),op,payload);end $$;
create function pg_temp.fx_def(name text,rounds integer default 1) returns jsonb language sql as $$ select jsonb_build_object('name',name,'kind','buff','source','Test spell','notes','Visible notes','active',true,'remainingRounds',rounds,'modifiers',jsonb_build_object('strength',2,'intelligence',2,'constitution',0,'dexterity',0,'charisma',0),'defenses','{"Fire":{"resistant":true,"vulnerable":false,"immune":false}}'::jsonb) $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','e1111111-1111-1111-1111-111111111111',true);
select set_config('dcc_test.s_game',public.dcc_host_game('Sheet first game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.s_game')::uuid,'e2222222-2222-2222-2222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.s_game')::uuid,'e3333333-3333-3333-3333-333333333333');
select set_config('dcc_test.s_other_game',public.dcc_host_game('Sheet second game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.s_other_game')::uuid,'e2222222-2222-2222-2222-222222222222');
select set_config('request.jwt.claim.sub','e2222222-2222-2222-2222-222222222222',true);
select public.dcc_save_profile(1,'Wizard',current_setting('dcc_test.s_profile')::jsonb);
select set_config('dcc_test.s_profile_version',(select version::text from public.dcc_crawler_profiles where slot=1),true);
select public.dcc_use_crawler_profile(current_setting('dcc_test.s_game')::uuid,1,current_setting('dcc_test.s_profile_version')::uuid);
select public.dcc_use_crawler_profile(current_setting('dcc_test.s_other_game')::uuid,1,current_setting('dcc_test.s_profile_version')::uuid);
select set_config('dcc_test.s_crawler',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.s_game')::uuid),true);
select set_config('dcc_test.s_potion',(select inventory->0->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
-- Private topics are scoped to the account, not campaign membership cache.
select pg_temp.s_assert(dcc_private.live_topic_allowed('dcc:user:e2222222-2222-2222-2222-222222222222'),'Own live topic rejected.');
select pg_temp.s_assert(not dcc_private.live_topic_allowed('dcc:user:e1111111-1111-1111-1111-111111111111'),'Player allowed GM live topic.');
select pg_temp.expect_skill_error('select pg_temp.fx(''add'',jsonb_build_object(''definition'',pg_temp.fx_def(''Forbidden'')))','42501');
select pg_temp.expect_skill_error('select dcc_private.live_notify(array[''e1111111-1111-1111-1111-111111111111''::uuid])','42501');
select pg_temp.expect_skill_error('update public.dcc_crawlers set tracked_effects=''[]''::jsonb','42501');
select set_config('request.jwt.claim.sub','e3333333-3333-3333-3333-333333333333',true);
select pg_temp.expect_skill_error('select pg_temp.fx(''tick'')','42501');
select pg_temp.s_assert(not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Another player reads effects.');
select set_config('request.jwt.claim.sub','e1111111-1111-1111-1111-111111111111',true);
select pg_temp.sheet_act('base-stats','{"bases":{"strength":10,"intelligence":10,"constitution":10,"dexterity":10,"charisma":10}}');
select pg_temp.sheet_act('typed-defenses','{"defenses":{"Ice":{"resistant":false,"vulnerable":false,"immune":true}}}');
select pg_temp.fx('add',jsonb_build_object('definition',pg_temp.fx_def('Short buff',1)));
select set_config('dcc_test.fx_id',(select tracked_effects->0->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.s_assert((select tutorial_profile#>>'{stats,strength,enhanced}'='12' and tutorial_profile#>>'{stats,intelligence,enhanced}'='12' and tutorial_profile->>'mana'='6' and current_segments=10 and typed_defenses#>>'{Fire,resistant}'='true' and typed_defenses#>>'{Ice,immune}'='true' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Effect failed to contribute or reset resources.');
select pg_temp.sheet_act('mana','{"value":12}');
select pg_temp.fx('add',jsonb_build_object('definition',pg_temp.fx_def('Long buff',2)));
select set_config('dcc_test.fx_long',(select tracked_effects->1->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.fx('tick');
select pg_temp.s_assert((select tracked_effects#>>'{0,remainingRounds}'='0' and tracked_effects#>>'{0,active}'='false' and tracked_effects#>>'{1,remainingRounds}'='1' and typed_defenses#>>'{Fire,resistant}'='true' and tutorial_profile#>>'{stats,strength,enhanced}'='12' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Expiration removed another source or did not deactivate.');
select pg_temp.fx('tick');
select pg_temp.s_assert((select tutorial_profile#>>'{stats,strength,enhanced}'='10' and tutorial_profile->>'mana'='10' and typed_defenses='{"Ice":{"resistant":false,"vulnerable":false,"immune":true}}'::jsonb from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Last expiration failed to remove temporary flags/clamp Mana.');
select pg_temp.expect_skill_error('select pg_temp.fx(''toggle'',jsonb_build_object(''id'',current_setting(''dcc_test.fx_id''),''active'',true))','22023');
-- Pausing freezes a duration, unlimited effects have no countdown.
select pg_temp.fx('edit',jsonb_build_object('id',current_setting('dcc_test.fx_id'),'definition',pg_temp.fx_def('Short buff',3)||'{"active":false}'::jsonb));
select pg_temp.fx('add',jsonb_build_object('definition',pg_temp.fx_def('Unlimited',null)));
select pg_temp.fx('tick');
select pg_temp.s_assert((select tracked_effects#>>'{0,remainingRounds}'='3' and tracked_effects#>'{2,remainingRounds}'='null'::jsonb and tutorial_profile->>'mana'='10' and tutorial_profile#>>'{stats,strength,enhanced}'='12' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Pause/unlimited duration or no-refill rule broken.');
-- Clear base defenses: the active effect still supplies Fire resistance.
select pg_temp.sheet_act('typed-defenses','{"defenses":{}}');
select pg_temp.s_assert((select typed_defenses#>>'{Fire,resistant}'='true' and not(typed_defenses?'Ice') and base_typed_defenses='{}'::jsonb from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Persistent and derived defense layers mixed.');
select pg_temp.sheet_act('damage','{"parts":[{"type":"Fire","amount":8}]}');
select pg_temp.s_assert((select current_segments=9 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Typed damage did not use active effect defense.');
-- Inactive note-only condition; no automatic action restrictions or numeric changes.
select pg_temp.fx('add',jsonb_build_object('definition',pg_temp.fx_def('Condition',null)||'{"kind":"condition","active":false,"modifiers":{"strength":0,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0},"defenses":{}}'::jsonb));
select pg_temp.expect_skill_error('select pg_temp.fx(''add'',jsonb_build_object(''definition'',pg_temp.fx_def(''Bad'',0)))','22023');
select pg_temp.expect_skill_error('select pg_temp.fx(''add'',jsonb_build_object(''definition'',pg_temp.fx_def(''Bad'',1)||''{"defenses":{"Laser":{"resistant":true,"vulnerable":false,"immune":false}}}''::jsonb))','22023');
select set_config('dcc_test.fx_stale',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.fx('remove',jsonb_build_object('id',current_setting('dcc_test.fx_long')));
select pg_temp.expect_skill_error(format('select public.dcc_effect_action(%L,%L,''tick'')',current_setting('dcc_test.s_crawler'),current_setting('dcc_test.fx_stale')),'40001');
-- Previous stat-modifier operations remain compatible with the new source layer.
select pg_temp.sheet_act('effect-add','{"name":"Legacy","active":true,"modifiers":{"strength":1,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0}}');
select set_config('dcc_test.fx_legacy',(select value->>'id' from public.dcc_crawlers,lateral jsonb_array_elements(tracked_effects) where id=current_setting('dcc_test.s_crawler')::uuid and value->>'name'='Legacy'),true);
select pg_temp.sheet_act('effect-remove',jsonb_build_object('id',current_setting('dcc_test.fx_legacy')));
select pg_temp.s_assert(not exists(select 1 from public.dcc_crawlers,lateral jsonb_array_elements(tracked_effects) where id=current_setting('dcc_test.s_crawler')::uuid and value->>'name'='Legacy'),'Legacy removal failed.');
select pg_temp.s_assert((select tracked_effects='[]'::jsonb and typed_defenses='{}'::jsonb and tutorial_profile->>'mana'='6' and current_segments=10 from public.dcc_crawlers where campaign_id=current_setting('dcc_test.s_other_game')::uuid),'Effects leaked to another game.');
select set_config('request.jwt.claim.sub','e2222222-2222-2222-2222-222222222222',true);
select pg_temp.s_assert((select version::text=current_setting('dcc_test.s_profile_version') from public.dcc_crawler_profiles where slot=1),'Effects altered account writeup.');
reset role;
-- Structural checks complement the separate two-account WebSocket acceptance checks.
do $$ begin
 if not exists(select 1 from pg_trigger where tgname='dcc_live_campaign' and not tgisinternal) or not exists(select 1 from pg_trigger where tgname='dcc_live_crawler' and not tgisinternal) then raise exception 'Live notification triggers missing.';end if;
 if not exists(select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname='dcc_private_live_read') then raise exception 'Private live policy missing.';end if;
end $$;
select 'PASS: tracked effects, expiration, projection, permissions, private topic predicate, versions and isolation' as result;
rollback;
