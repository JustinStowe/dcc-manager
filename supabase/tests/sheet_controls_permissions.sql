-- Run the complete script as administrator after migrations 001–009. All fixture
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
 ('c1111111-1111-1111-1111-111111111111','sheet-gm@example.invalid',now()),
 ('c2222222-2222-2222-2222-222222222222','sheet-player@example.invalid',now()),
 ('c3333333-3333-3333-3333-333333333333','sheet-other@example.invalid',now());
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
set local role authenticated;
select set_config('request.jwt.claim.sub','c1111111-1111-1111-1111-111111111111',true);
select set_config('dcc_test.s_game',public.dcc_host_game('Sheet first game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.s_game')::uuid,'c2222222-2222-2222-2222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.s_game')::uuid,'c3333333-3333-3333-3333-333333333333');
select set_config('dcc_test.s_other_game',public.dcc_host_game('Sheet second game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.s_other_game')::uuid,'c2222222-2222-2222-2222-222222222222');
select set_config('request.jwt.claim.sub','c2222222-2222-2222-2222-222222222222',true);
select public.dcc_save_profile(1,'Wizard',current_setting('dcc_test.s_profile')::jsonb);
select set_config('dcc_test.s_profile_version',(select version::text from public.dcc_crawler_profiles where slot=1),true);
select public.dcc_use_crawler_profile(current_setting('dcc_test.s_game')::uuid,1,current_setting('dcc_test.s_profile_version')::uuid);
select public.dcc_use_crawler_profile(current_setting('dcc_test.s_other_game')::uuid,1,current_setting('dcc_test.s_profile_version')::uuid);
select set_config('dcc_test.s_crawler',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.s_game')::uuid),true);
select set_config('dcc_test.s_potion',(select inventory->0->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
-- Owner actions and exact role boundaries.
select pg_temp.sheet_act('name','{"value":"Renamed player crawler"}');
select pg_temp.s_assert((select name='Renamed player crawler' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Owner rename failed.');
select pg_temp.sheet_act('mana','{"value":0}');select pg_temp.sheet_act('mana','{"value":6}');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''mana'',''{"value":7}'')','22023');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''mana'',''{"value":-1}'')','22023');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''mana'',''{"value":1.5}'')','22023');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''base-stats'',''{"bases":{}}'')','42501');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''level'',''{"value":2}'')','42501');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''floor'',''{"value":2}'')','42501');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''number'',''{"value":123}'')','42501');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''favor-award'',''{"amount":3}'')','42501');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''effect-add'',''{}'')','42501');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''defense'',''{"value":4}'')','42501');
select pg_temp.sheet_act('favor-use');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''favor-use'')','22023');
select set_config('request.jwt.claim.sub','c3333333-3333-3333-3333-333333333333',true);
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''mana'',''{"value":0}'')','42501');
select pg_temp.s_assert(not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Another player can read crawler.');
select set_config('request.jwt.claim.sub','c1111111-1111-1111-1111-111111111111',true);
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''name'',''{"value":"GM rename"}'')','42501');
select pg_temp.sheet_act('favor-award','{"amount":5}');
select pg_temp.sheet_act('level','{"value":7}');select pg_temp.sheet_act('floor','{"value":6}');select pg_temp.sheet_act('number','{"value":12345}');
select pg_temp.s_assert((select crawler_level=7 and dungeon_floor=6 and crawler_number=12345 and tutorial_profile->>'favor'='5' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'GM identity/Favor save failed.');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''level'',''{"value":0}'')','22023');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''floor'',''{"value":19}'')','22023');
select pg_temp.sheet_act('base-stats','{"bases":{"strength":10,"intelligence":10,"constitution":10,"dexterity":10,"charisma":10},"enhanced":{"strength":9999}}');
select pg_temp.s_assert((select tutorial_profile#>>'{stats,strength,base}'='10' and tutorial_profile#>>'{stats,strength,enhanced}'='10' and tutorial_profile->>'mana'='6' and current_segments=10 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Base change accepted forged Enhanced or refilled resources.');
select pg_temp.sheet_act('defense','{"value":4}');
select set_config('request.jwt.claim.sub','c2222222-2222-2222-2222-222222222222',true);
select pg_temp.sheet_act('damage','{"parts":[{"type":"Fire","amount":4},{"type":"Fire","amount":4}],"dr":999,"slots":10}');
select pg_temp.s_assert((select current_segments=9 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'DR repeated for same type or client fields trusted.');
select pg_temp.sheet_act('healing','{"amount":1}');
select pg_temp.sheet_act('damage','{"parts":[{"type":"Armor Piercing","amount":8}]}');
select pg_temp.s_assert((select current_segments=8 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Armor Piercing did not bypass DR.');
select pg_temp.sheet_act('damage','{"parts":[{"type":"Fire","amount":6},{"type":"Ice","amount":6}]}');
select pg_temp.s_assert((select current_segments=7 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Mixed damage did not combine net portions.');
select set_config('dcc_test.sheet_before',(select row_to_json(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''damage'',''{"parts":[{"type":"Laser","amount":9}]}'')','22023');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''damage'',''{"parts":[{"type":"Fire","amount":0}]}'')','22023');
select pg_temp.s_assert((select row_to_json(c)::text=current_setting('dcc_test.sheet_before') from public.dcc_crawlers c where id=current_setting('dcc_test.s_crawler')::uuid),'Rejected damage partially changed state.');
select pg_temp.sheet_act('healing','{"amount":10}');
select pg_temp.s_assert((select current_segments=10 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Healing did not cap at ten.');
select pg_temp.sheet_act('damage','{"parts":[{"type":"Armor Piercing","amount":1000}]}');
select pg_temp.s_assert((select current_segments=0 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Damage did not cap at zero.');
select pg_temp.sheet_act('healing','{"amount":3}');
-- Signed active modifiers; base-only saves; health preservation; clamp without refill.
select set_config('request.jwt.claim.sub','c1111111-1111-1111-1111-111111111111',true);
select pg_temp.sheet_act('effect-add','{"name":"Buff","active":true,"modifiers":{"strength":2,"intelligence":2,"constitution":0,"dexterity":0,"charisma":0}}');
select set_config('dcc_test.sheet_buff',(select stat_effects->0->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.s_assert((select tutorial_profile#>>'{stats,strength,enhanced}'='12' and tutorial_profile#>>'{stats,intelligence,enhanced}'='12' and tutorial_profile->>'mana'='6' and current_segments=3 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Buff reset resources or did not apply.');
select pg_temp.sheet_act('mana','{"value":12}');
select pg_temp.sheet_act('effect-toggle',jsonb_build_object('id',current_setting('dcc_test.sheet_buff'),'active',false));
select pg_temp.s_assert((select tutorial_profile#>>'{stats,intelligence,enhanced}'='10' and tutorial_profile->>'mana'='10' and current_segments=3 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Deactivation failed to clamp Mana or changed health.');
select pg_temp.sheet_act('effect-add','{"name":"Debuff","active":true,"modifiers":{"strength":0,"intelligence":-3,"constitution":0,"dexterity":0,"charisma":0}}');
select pg_temp.s_assert((select tutorial_profile#>>'{stats,intelligence,enhanced}'='7' and tutorial_profile->>'mana'='7' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Signed debuff failed.');
-- Old RPCs cannot manually set Enhanced scores after the trigger change.
select pg_temp.s_resource('stats',0,'{"strength":{"base":10,"enhanced":999},"intelligence":{"base":10,"enhanced":999},"constitution":{"base":10,"enhanced":999},"dexterity":{"base":10,"enhanced":999},"charisma":{"base":10,"enhanced":999}}');
select pg_temp.s_assert((select tutorial_profile#>>'{stats,intelligence,enhanced}'='7' and tutorial_profile#>>'{stats,strength,enhanced}'='10' and current_segments=3 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Legacy RPC bypassed derived Enhanced values.');
select pg_temp.sheet_act('effect-remove',jsonb_build_object('id',current_setting('dcc_test.sheet_buff')));
select pg_temp.s_assert((select jsonb_array_length(stat_effects)=1 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Modifier removal failed.');
select set_config('dcc_test.sheet_stale',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.sheet_act('mana','{"value":5}');
select pg_temp.expect_skill_error(format('select public.dcc_sheet_action(%L,%L,''mana'',''{"value":0}'')',current_setting('dcc_test.s_crawler'),current_setting('dcc_test.sheet_stale')),'40001');
select pg_temp.s_assert((select tutorial_profile->>'mana'='6' and crawler_level=1 and dungeon_floor=1 and stat_effects='[]'::jsonb from public.dcc_crawlers where campaign_id=current_setting('dcc_test.s_other_game')::uuid),'Sheet changes leaked across games.');
select pg_temp.s_assert((select version::text=current_setting('dcc_test.s_profile_version') from public.dcc_crawler_profiles where slot=1),'Sheet changes altered account writeup.');
reset role;
select 'PASS: sheet controls, typed damage, derived stats, permissions, concurrency and isolation' as result;
rollback;
