-- Run the complete script as administrator after migrations 001–009. All fixture
-- changes roll back. Any error before the final PASS means verification failed.
begin;
create function pg_temp.expect_loadout_error(statement text,expected text) returns void
language plpgsql security invoker as $$
begin
 begin execute statement;
 exception when others then if sqlstate<>expected then raise exception 'Expected %, got %: %',expected,sqlstate,sqlerrm;end if;return;end;
 raise exception 'Unexpected success: %',statement;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('a1111111-1111-1111-1111-111111111111','loadout-gm@example.invalid',now()),
 ('a2222222-2222-2222-2222-222222222222','loadout-player@example.invalid',now()),
 ('a3333333-3333-3333-3333-333333333333','loadout-other@example.invalid',now());
select set_config('dcc_test.l_profile','{"version":1,"pronouns":"","method":"array","initialStats":{"strength":2,"intelligence":6,"constitution":3,"dexterity":5,"charisma":4},"stats":{"strength":{"base":2,"enhanced":2},"intelligence":{"base":6,"enhanced":6},"constitution":{"base":3,"enhanced":3},"dexterity":{"base":5,"enhanced":5},"charisma":{"base":4,"enhanced":4}},"backgrounds":{"childhood":{"category":"childhood-1","skills":["Streetwise","Perception"]},"adolescence":{"category":"adolescence-1","skills":["Fabricate","Tracking"]},"career":{"category":"career-2","skills":["Dagger","Endurance"]},"hobby":{"category":"hobby-8","skills":["Driving","Repair"]}},"combatId":"fire-fingers","notes":{"trauma":"","looseEnds":"","regret":"","gear":""},"mana":6,"favor":1}',true);
select set_config('dcc_test.l_zero','{"strength":0,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0,"dr":0,"evade":0}',true);
create function pg_temp.l_act(op text,slot integer default null,kind text default null,target text default null,place text default null,bonuses jsonb default null,baseline jsonb default null,amount bigint default 0) returns void
language plpgsql security invoker as $$
begin perform public.dcc_loadout_action(current_setting('dcc_test.l_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid),op,slot,kind,target,place,bonuses,baseline,amount);end $$;
create function pg_temp.l_inventory(op text,item uuid default null,payload jsonb default null,place text default null) returns void
language plpgsql security invoker as $$
begin perform public.dcc_inventory_action(current_setting('dcc_test.l_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid),op,item,payload,place);end $$;
create function pg_temp.l_resource(op text,amount bigint default 0,stats jsonb default null) returns void
language plpgsql security invoker as $$
begin perform public.dcc_tutorial_action(current_setting('dcc_test.l_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid),op,amount,stats);end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-1111-1111-111111111111',true);
select set_config('dcc_test.l_game',public.dcc_host_game('Loadout first game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.l_game')::uuid,'a2222222-2222-2222-2222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.l_game')::uuid,'a3333333-3333-3333-3333-333333333333');
select set_config('dcc_test.l_other_game',public.dcc_host_game('Loadout second game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.l_other_game')::uuid,'a2222222-2222-2222-2222-222222222222');
select set_config('request.jwt.claim.sub','a2222222-2222-2222-2222-222222222222',true);
select public.dcc_save_profile(1,'Wizard',current_setting('dcc_test.l_profile')::jsonb);
select set_config('dcc_test.l_profile_version',(select version::text from public.dcc_crawler_profiles where slot=1),true);
select public.dcc_use_crawler_profile(current_setting('dcc_test.l_game')::uuid,1,current_setting('dcc_test.l_profile_version')::uuid);
select public.dcc_use_crawler_profile(current_setting('dcc_test.l_other_game')::uuid,1,current_setting('dcc_test.l_profile_version')::uuid);
select set_config('dcc_test.l_crawler',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.l_game')::uuid),true);
select set_config('dcc_test.l_potion',(select inventory->0->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid),true);
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and jsonb_array_length(hotlist)=10 and hotlist#>>'{0,target}'='heal' and hotlist#>>'{1,target}'='fire-fingers' and hotlist#>>'{2,target}'=current_setting('dcc_test.l_potion') and stat_baseline=tutorial_profile->'stats') then raise exception 'New crawler preparation/baseline incorrect.';end if;
end $$;
-- Stack references move, never duplicate quantity, and invalid targets/slots fail.
select pg_temp.l_act('assign',10,'item',current_setting('dcc_test.l_potion'));
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and hotlist->2='null'::jsonb and hotlist#>>'{9,target}'=current_setting('dcc_test.l_potion') and inventory->0->>'quantity'='5') then raise exception 'Hotlist move duplicated a reference/quantity.';end if;
end $$;
select pg_temp.expect_loadout_error('select pg_temp.l_act(''assign'',11,''skill'',''heal'')','22023');
select pg_temp.expect_loadout_error('select pg_temp.l_act(''assign'',2,''skill'',''unknown'')','22023');
select pg_temp.expect_loadout_error('select pg_temp.l_act(''assign'',2,''item'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'')','22023');
select pg_temp.expect_loadout_error('select pg_temp.l_act(''use'',10)','22023'); -- Mana is full.
select pg_temp.l_resource('mana-spend',3);
select set_config('dcc_test.l_stale',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid),true);
select pg_temp.l_act('use',10);
select pg_temp.expect_loadout_error(format('select public.dcc_loadout_action(%L,%L,''use'',10)',current_setting('dcc_test.l_crawler'),current_setting('dcc_test.l_stale')),'40001');
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and tutorial_profile->>'mana'='6' and inventory->0->>'quantity'='4') then raise exception 'Prepared potion did not commit Mana and quantity together.';end if;
end $$;
-- Last-item cleanup also applies to consumption outside the Hotlist.
select pg_temp.l_inventory('edit',current_setting('dcc_test.l_potion')::uuid,jsonb_build_object('name','Mana potion','kind','consumable','quantity',1,'notes','','gearSlot','none','effect','mana-full'));
select pg_temp.l_resource('mana-spend',1);
select pg_temp.l_inventory('drink-mana',current_setting('dcc_test.l_potion')::uuid);
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and hotlist->9='null'::jsonb and inventory='[]'::jsonb) then raise exception 'Last item left a stale reference.';end if;
end $$;
select pg_temp.l_resource('damage',4);select pg_temp.l_act('use',1);
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and current_segments=10 and tutorial_profile->>'mana'='4') then raise exception 'Prepared Heal failed.';end if;
end $$;
-- Owners may acquire plain items but may not forge definitions via any RPC.
select pg_temp.l_inventory('add',null,'{"name":"Intelligence hat","kind":"gear","quantity":8,"notes":"","gearSlot":"head"}');
select set_config('dcc_test.l_hat',(select inventory->0->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid),true);
select pg_temp.expect_loadout_error(format('select pg_temp.l_act(''bonuses'',null,null,%L,null,%L::jsonb,%L::jsonb)',current_setting('dcc_test.l_hat'),current_setting('dcc_test.l_zero'),current_setting('dcc_test.l_profile')::jsonb->'stats'),'42501');
select pg_temp.expect_loadout_error('select pg_temp.l_act(''defense'',null,null,null,null,null,null,2)','42501');
select pg_temp.expect_loadout_error(format('select pg_temp.l_inventory(''edit'',%L,%L::jsonb)',current_setting('dcc_test.l_hat'),jsonb_build_object('name','Hat','kind','gear','quantity',8,'notes','','gearSlot','head','bonuses',current_setting('dcc_test.l_zero')::jsonb)),'42501');
-- GM reviews baseline and item definitions in one atomic update.
select set_config('request.jwt.claim.sub','a1111111-1111-1111-1111-111111111111',true);
select pg_temp.l_act('bonuses',null,null,current_setting('dcc_test.l_hat'),null,current_setting('dcc_test.l_zero')::jsonb||'{"intelligence":3,"constitution":2,"dr":4,"evade":1}',current_setting('dcc_test.l_profile')::jsonb->'stats');
-- Stored gear grants no stats. Quantity 8 still grants just one equipped copy.
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and tutorial_profile#>>'{stats,intelligence,enhanced}'='6') then raise exception 'Stored gear granted bonuses.';end if;
end $$;
select pg_temp.l_inventory('equip',current_setting('dcc_test.l_hat')::uuid,null,'head');
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and tutorial_profile#>>'{stats,intelligence,enhanced}'='9' and constitution=5 and tutorial_profile->>'mana'='4' and current_segments=10 and stat_baseline#>>'{intelligence,enhanced}'='6') then raise exception 'Gear layers or preserved resources incorrect.';end if;
end $$;
select pg_temp.l_resource('mana-recover',100);
select pg_temp.l_inventory('edit',current_setting('dcc_test.l_hat')::uuid,'{"name":"Reviewed hat","kind":"gear","quantity":7,"notes":"Keep definitions","gearSlot":"head"}');
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and tutorial_profile#>>'{stats,intelligence,enhanced}'='9' and inventory->0->'bonuses'->>'intelligence'='3') then raise exception 'Editing lost bonuses or accumulated them twice.';end if;
end $$;
-- Manual Enhanced input is ignored after migration 009. Gear alone changes the maximum.
-- Final maximum stays nine, so current Mana must never pass through five/six.
select pg_temp.l_act('bonuses',null,null,current_setting('dcc_test.l_hat'),null,current_setting('dcc_test.l_zero')::jsonb||'{"intelligence":4,"constitution":2,"dr":4,"evade":1}',jsonb_set(current_setting('dcc_test.l_profile')::jsonb->'stats','{intelligence,enhanced}','5'));
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and tutorial_profile->>'mana'='9' and tutorial_profile#>>'{stats,intelligence,enhanced}'='10') then raise exception 'Derived maximum or preserved Mana incorrect.';end if;
end $$;
select pg_temp.l_act('bonuses',null,null,current_setting('dcc_test.l_hat'),null,current_setting('dcc_test.l_zero')::jsonb||'{"intelligence":3,"constitution":2,"dr":4,"evade":1}',current_setting('dcc_test.l_profile')::jsonb->'stats');
-- Non-gear baseline changes still add equipment exactly once, then clamp Mana
-- against the FINAL effective maximum rather than the intermediate baseline.
select pg_temp.l_resource('stats',0,jsonb_set(jsonb_set(current_setting('dcc_test.l_profile')::jsonb->'stats','{intelligence,base}','5'),'{intelligence,enhanced}','999'));
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and tutorial_profile#>>'{stats,intelligence,enhanced}'='8' and tutorial_profile->>'mana'='8') then raise exception 'Baseline stat update clamped against the wrong layer.';end if;
end $$;
select pg_temp.l_inventory('equip',current_setting('dcc_test.l_hat')::uuid,null,'stored');
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and tutorial_profile#>>'{stats,intelligence,enhanced}'='5' and tutorial_profile->>'mana'='5' and current_segments=10 and constitution=3) then raise exception 'Unequip did not preserve health/clamp Mana.';end if;
end $$;
select pg_temp.l_inventory('equip',current_setting('dcc_test.l_hat')::uuid,null,'head');
select pg_temp.l_act('defense',null,null,null,null,null,null,2);
-- DR 6, Con 5 modifier 2: raw 11 becomes 5 net and loses 2 slots.
select pg_temp.l_act('damage-dr',null,null,null,null,null,null,11);
do $$ begin
 if (select current_segments from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid)<>8 then raise exception 'DR ordering incorrect.';end if;
end $$;
-- Existing net-damage path does not subtract DR again: net 4 loses 2 more slots.
select pg_temp.l_resource('damage',4);
do $$ begin
 if (select current_segments from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid)<>6 then raise exception 'Final net damage double-subtracted DR.';end if;
end $$;
-- Quick ready atomically replaces conflicting hands, with gloves unaffected.
select pg_temp.l_inventory('add',null,'{"name":"Sword","kind":"weapon","quantity":1,"notes":"","gearSlot":"holding"}');
select set_config('dcc_test.l_sword',(select inventory->1->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid),true);
select pg_temp.l_inventory('equip',current_setting('dcc_test.l_sword')::uuid,null,'main-hand');
select pg_temp.l_inventory('add',null,'{"name":"Gloves","kind":"gear","quantity":1,"notes":"","gearSlot":"hands"}');
select pg_temp.l_inventory('equip',(select (inventory->2->>'id')::uuid from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid),null,'hands');
select pg_temp.l_inventory('add',null,'{"name":"Two-handed sword","kind":"weapon","quantity":1,"notes":"","gearSlot":"two-hands"}');
select set_config('dcc_test.l_big',(select inventory->3->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid),true);
select pg_temp.l_act('assign',4,'item',current_setting('dcc_test.l_big'));select pg_temp.l_act('ready',4,null,null,'two-hands');
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and inventory->1->>'location'='stored' and inventory->2->>'location'='hands' and inventory->3->>'location'='two-hands') then raise exception 'Atomic holding swap incorrect.';end if;
end $$;
-- Replacing a Hotlist slot keeps its old item, and dropping clears every ref.
select pg_temp.l_act('assign',4,'item',current_setting('dcc_test.l_hat'));
select pg_temp.l_inventory('remove',current_setting('dcc_test.l_hat')::uuid);
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid and hotlist->3='null'::jsonb and jsonb_array_length(inventory)=3 and tutorial_profile#>>'{stats,intelligence,enhanced}'='5') then raise exception 'Removal left bonus or quick reference.';end if;
end $$;
-- All HUD mutations are blocked while Dying, with zero health preserved.
select pg_temp.l_resource('damage',100);
select set_config('dcc_test.l_snapshot',(select to_jsonb(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.l_crawler')::uuid),true);
select pg_temp.expect_loadout_error('select pg_temp.l_act(''use'',1)','22023');
select pg_temp.expect_loadout_error('select pg_temp.l_act(''assign'',1,''skill'',''heal'')','22023');
select pg_temp.expect_loadout_error('select pg_temp.l_act(''clear'',1)','22023');
do $$ begin
 if (select to_jsonb(c) from public.dcc_crawlers c where id=current_setting('dcc_test.l_crawler')::uuid) is distinct from current_setting('dcc_test.l_snapshot')::jsonb then raise exception 'Rejected HUD action partially changed the row.';end if;
end $$;
-- Other players cannot read/use a guessed loadout; other games and profiles
-- remain unchanged. Anonymous callers have no mutation entry point.
select set_config('request.jwt.claim.sub','a3333333-3333-3333-3333-333333333333',true);
do $$ begin if exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.l_crawler')::uuid) then raise exception 'Another player loadout leaked.';end if;end $$;
select pg_temp.expect_loadout_error('select pg_temp.l_act(''use'',1)','42501');
select set_config('request.jwt.claim.sub','a2222222-2222-2222-2222-222222222222',true);
do $$ begin
 if not exists(select 1 from public.dcc_crawlers where campaign_id=current_setting('dcc_test.l_other_game')::uuid and inventory->0->>'quantity'='5' and tutorial_profile->>'mana'='6') then raise exception 'Another game changed.';end if;
 if not exists(select 1 from public.dcc_crawler_profiles where slot=1 and version=current_setting('dcc_test.l_profile_version')::uuid) then raise exception 'Account writeup changed.';end if;
end $$;
reset role;
do $$ begin if has_function_privilege('anon','public.dcc_loadout_action(uuid,uuid,text,integer,text,text,text,jsonb,jsonb,bigint)','EXECUTE') then raise exception 'Anonymous write privilege.';end if;end $$;
rollback;
select 'PASS: Equipment and Hotlist assertions completed; fixtures rolled back.' as result;
