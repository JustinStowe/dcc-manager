-- Run the complete script as administrator after migrations 001–010. All fixture
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
 ('d1111111-1111-1111-1111-111111111111','typed-gm@example.invalid',now()),
 ('d2222222-2222-2222-2222-222222222222','typed-player@example.invalid',now()),
 ('d3333333-3333-3333-3333-333333333333','typed-other@example.invalid',now());
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
create function pg_temp.defense_hit(parts jsonb,expected integer) returns void language plpgsql security invoker as $$ begin
 perform pg_temp.sheet_act('healing','{"amount":10}');
 perform pg_temp.sheet_act('damage',jsonb_build_object('parts',parts));
 perform pg_temp.s_assert((select current_segments=expected from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Incorrect typed damage result.');
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','d1111111-1111-1111-1111-111111111111',true);
select set_config('dcc_test.s_game',public.dcc_host_game('Typed first game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.s_game')::uuid,'d2222222-2222-2222-2222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.s_game')::uuid,'d3333333-3333-3333-3333-333333333333');
select set_config('dcc_test.s_other_game',public.dcc_host_game('Typed second game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.s_other_game')::uuid,'d2222222-2222-2222-2222-222222222222');
select set_config('request.jwt.claim.sub','d2222222-2222-2222-2222-222222222222',true);
select public.dcc_save_profile(1,'Wizard',current_setting('dcc_test.s_profile')::jsonb);
select set_config('dcc_test.s_profile_version',(select version::text from public.dcc_crawler_profiles where slot=1),true);
select public.dcc_use_crawler_profile(current_setting('dcc_test.s_game')::uuid,1,current_setting('dcc_test.s_profile_version')::uuid);
select public.dcc_use_crawler_profile(current_setting('dcc_test.s_other_game')::uuid,1,current_setting('dcc_test.s_profile_version')::uuid);
select set_config('dcc_test.s_crawler',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.s_game')::uuid),true);
select set_config('dcc_test.s_potion',(select inventory->0->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.s_assert((select typed_defenses='{}'::jsonb from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'New crawler inferred defenses.');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''typed-defenses'',''{"defenses":{"Fire":{"resistant":true,"vulnerable":false,"immune":false}}}'')','42501');
select pg_temp.expect_skill_error('update public.dcc_crawlers set typed_defenses=''{}''::jsonb','42501');
select set_config('request.jwt.claim.sub','d3333333-3333-3333-3333-333333333333',true);
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''typed-defenses'',''{"defenses":{}}'')','42501');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''damage'',''{"parts":[{"type":"Fire","amount":13}]}'')','42501');
select pg_temp.s_assert(not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Other player can read crawler defenses.');
select set_config('request.jwt.claim.sub','d1111111-1111-1111-1111-111111111111',true);
select pg_temp.sheet_act('base-stats','{"bases":{"strength":10,"intelligence":10,"constitution":10,"dexterity":10,"charisma":10}}');
select pg_temp.sheet_act('defense','{"value":4}');
select set_config('dcc_test.defense_before',(select jsonb_build_object('health',current_segments,'profile',tutorial_profile,'inventory',inventory,'skills',learned_skills,'hotlist',hotlist,'baseline',stat_baseline,'effects',stat_effects)::text from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.sheet_act('typed-defenses','{"defenses":{"Fire":{"resistant":true,"vulnerable":false,"immune":false},"Ice":{"resistant":false,"vulnerable":true,"immune":false},"Poison":{"resistant":false,"vulnerable":false,"immune":true}}}');
select pg_temp.s_assert((select jsonb_build_object('health',current_segments,'profile',tutorial_profile,'inventory',inventory,'skills',learned_skills,'hotlist',hotlist,'baseline',stat_baseline,'effects',stat_effects)::text=current_setting('dcc_test.defense_before') from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Defense edit altered resources or other crawler data.');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''typed-defenses'',''{"defenses":{"Laser":{"resistant":true,"vulnerable":false,"immune":false}}}'')','22023');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''typed-defenses'',''{"defenses":{"Armor Piercing":{"resistant":false,"vulnerable":false,"immune":true}}}'')','22023');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''typed-defenses'',''{"defenses":{"Fire":{"resistant":"yes","vulnerable":false,"immune":false}}}'')','22023');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''typed-defenses'',''{"defenses":{"Fire":{"resistant":true}}}'')','22023');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''typed-defenses'',''{"defenses":[]}'')','22023');
select pg_temp.expect_skill_error('select pg_temp.sheet_act(''typed-defenses'',''{"defenses":{"Fire":{"resistant":true,"vulnerable":false,"immune":false,"extra":true}}}'')','22023');
select set_config('request.jwt.claim.sub','d2222222-2222-2222-2222-222222222222',true);
-- DR 4, Constitution modifier 4. Raw damage must never be pre-adjusted.
select pg_temp.defense_hit('[{"type":"Fire","amount":13}]',9); -- (13-4)/2 -> 4
select pg_temp.defense_hit('[{"type":"Ice","amount":9}]',8); -- (9-4)*2 -> 10
select pg_temp.defense_hit('[{"type":"Poison","amount":1000}]',10); -- immune
select pg_temp.defense_hit('[{"type":"Fire","amount":4},{"type":"Fire","amount":9}]',9); -- same type: one DR and rounding step
select pg_temp.defense_hit('[{"type":"Fire","amount":13},{"type":"Ice","amount":9},{"type":"Poison","amount":100}]',7); -- 4+10+0=14 -> 3 slots
select pg_temp.defense_hit('[{"type":"Fire","amount":3}]',10); -- no negative damage
select pg_temp.defense_hit('[{"type":"Armor Piercing","amount":8}]',8); -- existing untyped bypass
select pg_temp.sheet_act('healing','{"amount":10}');
select pg_temp.sheet_act('damage','{"parts":[{"type":"Fire","amount":13}],"defenses":{"Fire":{"resistant":false,"vulnerable":false,"immune":true}},"dr":999,"net":0}');
select pg_temp.s_assert((select current_segments=9 from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Client-supplied defenses/DR were trusted.');
select set_config('request.jwt.claim.sub','d1111111-1111-1111-1111-111111111111',true);
select pg_temp.sheet_act('typed-defenses','{"defenses":{"Fire":{"resistant":true,"vulnerable":true,"immune":false}}}');
select pg_temp.defense_hit('[{"type":"Fire","amount":13}]',8); -- floor(9/2)*2=8, not 9
select pg_temp.sheet_act('typed-defenses','{"defenses":{"Fire":{"resistant":true,"vulnerable":true,"immune":true}}}');
select pg_temp.defense_hit('[{"type":"Fire","amount":1000000000}]',10);
-- All 13 supported typed-defense keys use the same validated pipeline.
do $$ declare damage_type text;begin
 foreach damage_type in array array['Acid','Bludgeoning','Electric','Fire','Force','Holy','Ice','Necrotic','Piercing','Poison','Psychic','Slashing','Sonic'] loop
  perform pg_temp.sheet_act('typed-defenses',jsonb_build_object('defenses',jsonb_build_object(damage_type,jsonb_build_object('resistant',true,'vulnerable',false,'immune',false))));
  perform pg_temp.defense_hit(jsonb_build_array(jsonb_build_object('type',damage_type,'amount',13)),9);
 end loop;
end $$;
-- Clearing neutral flags is an explicit GM save; resources stay unchanged.
select pg_temp.sheet_act('typed-defenses','{"defenses":{"Fire":{"resistant":false,"vulnerable":false,"immune":false}}}');
select pg_temp.s_assert((select typed_defenses='{}'::jsonb from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Neutral defense flags did not clear.');
select pg_temp.defense_hit('[{"type":"Fire","amount":13}]',8); -- no resistance: 9 net
select set_config('dcc_test.defense_stale',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.sheet_act('typed-defenses','{"defenses":{"Fire":{"resistant":true,"vulnerable":false,"immune":false}}}');
select pg_temp.expect_skill_error(format('select public.dcc_sheet_action(%L,%L,''typed-defenses'',''{"defenses":{}}'')',current_setting('dcc_test.s_crawler'),current_setting('dcc_test.defense_stale')),'40001');
select pg_temp.expect_skill_error(format('select public.dcc_sheet_action(%L,%L,''damage'',''{"parts":[{"type":"Fire","amount":13}]}'')',current_setting('dcc_test.s_crawler'),current_setting('dcc_test.defense_stale')),'40001');
select pg_temp.s_assert((select typed_defenses='{}'::jsonb and tutorial_profile->>'mana'='6' and current_segments=10 from public.dcc_crawlers where campaign_id=current_setting('dcc_test.s_other_game')::uuid),'Defenses or damage leaked to another game.');
select pg_temp.s_assert((select version::text=current_setting('dcc_test.s_profile_version') from public.dcc_crawler_profiles where slot=1),'Defense edits changed saved account writeup.');
reset role;
select 'PASS: typed defenses, calculation order, rounding, permissions, concurrency, and isolation' as result;
rollback;
