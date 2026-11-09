-- Run the whole script as administrator after migrations 001 through 006.
-- The final ROLLBACK removes fixtures; any preceding error means FAIL.
begin;
create function pg_temp.potion_expect_error(statement text, expected text) returns void
language plpgsql security invoker as $$
begin
  begin execute statement;
  exception when others then
    if sqlstate<>expected then raise exception 'Expected %, got %: %',expected,sqlstate,sqlerrm; end if;
    return;
  end;
  raise exception 'Unexpected success: %',statement;
end;
$$;
insert into auth.users(id,email,email_confirmed_at) values
 ('f1111111-1111-1111-1111-111111111111','potion-gm@example.invalid',now()),
 ('f2222222-2222-2222-2222-222222222222','potion-player@example.invalid',now()),
 ('f3333333-3333-3333-3333-333333333333','potion-other@example.invalid',now());
select set_config('dcc_test.potion_profile','{"version":1,"pronouns":"","method":"array","initialStats":{"strength":2,"intelligence":6,"constitution":3,"dexterity":5,"charisma":4},"stats":{"strength":{"base":2,"enhanced":2},"intelligence":{"base":6,"enhanced":6},"constitution":{"base":3,"enhanced":3},"dexterity":{"base":5,"enhanced":5},"charisma":{"base":4,"enhanced":4}},"backgrounds":{"childhood":{"category":"childhood-1","skills":["Streetwise","Perception"]},"adolescence":{"category":"adolescence-1","skills":["Fabricate","Tracking"]},"career":{"category":"career-2","skills":["Dagger","Endurance"]},"hobby":{"category":"hobby-8","skills":["Driving","Repair"]}},"combatId":"fire-fingers","notes":{"trauma":"","looseEnds":"","regret":"","gear":""},"mana":6,"favor":1}',true);
create function pg_temp.potion_act(op text,item uuid default null,payload jsonb default null) returns void
language plpgsql security invoker as $$
declare current_version uuid;
begin
 select version into current_version from public.dcc_crawlers where id=current_setting('dcc_test.potion_crawler')::uuid;
 perform public.dcc_inventory_action(current_setting('dcc_test.potion_crawler')::uuid,current_version,op,item,payload);
end;
$$;
create function pg_temp.potion_resource(op text,amount bigint default 0,stats jsonb default null) returns void
language plpgsql security invoker as $$
declare current_version uuid;
begin
 select version into current_version from public.dcc_crawlers where id=current_setting('dcc_test.potion_crawler')::uuid;
 perform public.dcc_tutorial_action(current_setting('dcc_test.potion_crawler')::uuid,current_version,op,amount,stats);
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',true);
select set_config('dcc_test.potion_game',public.dcc_host_game('Potion first game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.potion_game')::uuid,'f2222222-2222-2222-2222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.potion_game')::uuid,'f3333333-3333-3333-3333-333333333333');
select set_config('dcc_test.potion_other_game',public.dcc_host_game('Potion second game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.potion_other_game')::uuid,'f2222222-2222-2222-2222-222222222222');
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
select public.dcc_save_profile(1,'Wizard',current_setting('dcc_test.potion_profile')::jsonb);
select set_config('dcc_test.potion_saved_version',(select version::text from public.dcc_crawler_profiles where slot=1),true);
select public.dcc_use_crawler_profile(current_setting('dcc_test.potion_game')::uuid,1,current_setting('dcc_test.potion_saved_version')::uuid);
select public.dcc_use_crawler_profile(current_setting('dcc_test.potion_other_game')::uuid,1,current_setting('dcc_test.potion_saved_version')::uuid);
select set_config('dcc_test.potion_crawler',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.potion_game')::uuid),true);
select set_config('dcc_test.potion_item',(select inventory->0->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.potion_crawler')::uuid),true);
select set_config('dcc_test.potion_snapshot',(select to_jsonb(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.potion_crawler')::uuid),true);
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.potion_crawler')::uuid and inventory->0->>'effect'='mana-full' and inventory->0->>'quantity'='5') then raise exception 'New starting potions not identified.'; end if;
end $$;
-- Full Mana and the generic-consume bypass both reject without any row change.
select pg_temp.potion_expect_error(format('select pg_temp.potion_act(''drink-mana'',%L)',current_setting('dcc_test.potion_item')),'22023');
select pg_temp.potion_expect_error(format('select pg_temp.potion_act(''consume'',%L)',current_setting('dcc_test.potion_item')),'22023');
do $$ begin
 if (select to_jsonb(c) from public.dcc_crawlers c where id=current_setting('dcc_test.potion_crawler')::uuid) is distinct from current_setting('dcc_test.potion_snapshot')::jsonb then raise exception 'Rejected use changed the row.'; end if;
end $$;
-- Missing Mana: exactly one potion and the full restore commit together.
select pg_temp.potion_resource('mana-spend',4);
select set_config('dcc_test.potion_stale',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.potion_crawler')::uuid),true);
select pg_temp.potion_act('drink-mana',current_setting('dcc_test.potion_item')::uuid,'{"mana":99999,"quantity":99999}');
select pg_temp.potion_expect_error(format('select public.dcc_inventory_action(%L,%L,''drink-mana'',%L)',current_setting('dcc_test.potion_crawler'),current_setting('dcc_test.potion_stale'),current_setting('dcc_test.potion_item')),'40001');
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.potion_crawler')::uuid and inventory->0->>'quantity'='4' and tutorial_profile->>'mana'='6' and tutorial_profile->>'favor'='1' and current_segments=10) then raise exception 'Wrong atomic potion result.'; end if;
 if not exists(select 1 from public.dcc_crawlers where campaign_id=current_setting('dcc_test.potion_other_game')::uuid and inventory->0->>'quantity'='5' and tutorial_profile->>'mana'='6') then raise exception 'Other game changed.'; end if;
 if not exists(select 1 from public.dcc_crawler_profiles where slot=1 and version=current_setting('dcc_test.potion_saved_version')::uuid and profile->>'mana'='6') then raise exception 'Account writeup changed.'; end if;
end $$;
-- Another player cannot read or use this inventory, even with guessed IDs.
select set_config('request.jwt.claim.sub','f3333333-3333-3333-3333-333333333333',true);
do $$ begin
 if exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.potion_crawler')::uuid) then raise exception 'Player row leaked.'; end if;
end $$;
select pg_temp.potion_expect_error(format('select pg_temp.potion_act(''drink-mana'',%L)',current_setting('dcc_test.potion_item')),'42501');
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
-- A same-named manual consumable does not gain a Mana effect.
select pg_temp.potion_act('add',null,'{"name":"Standard Mana Potion","kind":"consumable","quantity":2,"notes":"Custom bottle","gearSlot":"none"}');
select set_config('dcc_test.potion_manual',(select inventory->1->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.potion_crawler')::uuid),true);
select pg_temp.potion_expect_error(format('select pg_temp.potion_act(''drink-mana'',%L)',current_setting('dcc_test.potion_manual')),'22023');
select pg_temp.potion_act('consume',current_setting('dcc_test.potion_manual')::uuid);
select pg_temp.potion_expect_error(format('select pg_temp.potion_act(''classify'',%L,''{"effect":"mana-full"}'')',current_setting('dcc_test.potion_manual')),'42501');
select pg_temp.potion_expect_error(format('select pg_temp.potion_act(''edit'',%L,''{"name":"Standard Mana Potion","kind":"consumable","quantity":1,"notes":"","gearSlot":"none","effect":"mana-full"}'')',current_setting('dcc_test.potion_manual')),'22023');
select pg_temp.potion_expect_error('select pg_temp.potion_act(''add'',null,''{"name":"Sword","kind":"weapon","quantity":1,"notes":"","gearSlot":"holding","effect":"mana-full"}'')','22023');
select pg_temp.potion_expect_error('select pg_temp.potion_act(''add'',null,''{"name":"Bottle","kind":"consumable","quantity":1,"notes":"","gearSlot":"none","effect":"unknown"}'')','22023');
-- Legacy entries with no effect are still manual; migration 006 never backfills
-- an effect or refills a quantity. Simulate one of those unchanged old entries.
reset role;
update public.dcc_crawlers set inventory=jsonb_set(inventory,'{1}',(inventory->1)-'effect'),version=gen_random_uuid()
 where id=current_setting('dcc_test.potion_crawler')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
select pg_temp.potion_expect_error(format('select pg_temp.potion_act(''drink-mana'',%L)',current_setting('dcc_test.potion_manual')),'22023');
select set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',true);
select pg_temp.potion_act('classify',current_setting('dcc_test.potion_manual')::uuid,'{"effect":"mana-full"}');
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.potion_crawler')::uuid and inventory->1->>'quantity'='1' and tutorial_profile->>'mana'='6') then raise exception 'Classification refilled resources or quantities.'; end if;
end $$;
-- The current Enhanced maximum, not starting Intelligence, determines recovery.
select pg_temp.potion_resource('stats',0,jsonb_set(current_setting('dcc_test.potion_profile')::jsonb->'stats','{intelligence,enhanced}','20'));
select pg_temp.potion_act('drink-mana',current_setting('dcc_test.potion_manual')::uuid);
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.potion_crawler')::uuid and tutorial_profile->>'mana'='20' and jsonb_array_length(inventory)=1 and inventory->0->>'quantity'='4') then raise exception 'Last potion or Enhanced Mana handling failed.'; end if;
end $$;
-- Dying blocks self-drinking with NO partial quantity change. External healing
-- through the existing tracker can make a later use valid.
select pg_temp.potion_resource('damage',100);
select pg_temp.potion_resource('mana-spend',1);
select set_config('dcc_test.potion_snapshot',(select to_jsonb(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.potion_crawler')::uuid),true);
select pg_temp.potion_expect_error(format('select pg_temp.potion_act(''drink-mana'',%L)',current_setting('dcc_test.potion_item')),'22023');
do $$ begin
 if (select to_jsonb(c) from public.dcc_crawlers c where id=current_setting('dcc_test.potion_crawler')::uuid) is distinct from current_setting('dcc_test.potion_snapshot')::jsonb then raise exception 'Dying refusal partially changed the crawler.'; end if;
end $$;
select pg_temp.potion_resource('heal-slots',1);
select pg_temp.potion_act('drink-mana',current_setting('dcc_test.potion_item')::uuid);
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.potion_crawler')::uuid and current_segments=1 and tutorial_profile->>'mana'='20' and inventory->0->>'quantity'='3') then raise exception 'Later valid potion failed.'; end if;
end $$;
-- Row versions are shared with health/Mana writes; they cannot replay across use.
select set_config('dcc_test.potion_stale',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.potion_crawler')::uuid),true);
select pg_temp.potion_act('classify',current_setting('dcc_test.potion_item')::uuid,'{"effect":"manual"}');
select pg_temp.potion_expect_error(format('select public.dcc_tutorial_action(%L,%L,''mana-spend'',1)',current_setting('dcc_test.potion_crawler'),current_setting('dcc_test.potion_stale')),'40001');
select public.dcc_delete_game(current_setting('dcc_test.potion_game')::uuid,'Potion first game');
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where campaign_id=current_setting('dcc_test.potion_other_game')::uuid and inventory->0->>'quantity'='5') then raise exception 'Deletion changed other game.'; end if;
 if not exists(select 1 from public.dcc_crawler_profiles where slot=1) then raise exception 'Deletion removed writeup.'; end if;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.dcc_inventory_action(uuid,uuid,text,uuid,jsonb,text)','EXECUTE') then raise exception 'Anonymous potion writes allowed.'; end if;
end $$;
rollback;
select 'PASS: Potion assertions completed; fixtures rolled back.' as result;
