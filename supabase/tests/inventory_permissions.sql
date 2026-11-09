-- Run the whole file as postgres/administrator, after migration 005.
-- All fixtures and helper functions are rolled back; any exception means FAIL.
begin;
create function pg_temp.inventory_expect_error(statement text, expected text) returns void
language plpgsql security invoker as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate<>expected then raise exception 'Expected SQLSTATE %, received %: %',expected,sqlstate,sqlerrm; end if;
    return;
  end;
  raise exception 'Statement unexpectedly succeeded: %',statement;
end;
$$;
insert into auth.users(id,email,email_confirmed_at) values
 ('e1111111-1111-1111-1111-111111111111','inventory-gm@example.invalid',now()),
 ('e2222222-2222-2222-2222-222222222222','inventory-alice@example.invalid',now()),
 ('e3333333-3333-3333-3333-333333333333','inventory-bob@example.invalid',now()),
 ('e4444444-4444-4444-4444-444444444444','inventory-outsider@example.invalid',now());
select set_config('dcc_test.inventory_profile','{"version":1,"pronouns":"","method":"array","initialStats":{"strength":2,"intelligence":6,"constitution":3,"dexterity":5,"charisma":4},"stats":{"strength":{"base":2,"enhanced":2},"intelligence":{"base":6,"enhanced":6},"constitution":{"base":3,"enhanced":3},"dexterity":{"base":5,"enhanced":5},"charisma":{"base":4,"enhanced":4}},"backgrounds":{"childhood":{"category":"childhood-1","skills":["Streetwise","Perception"]},"adolescence":{"category":"adolescence-1","skills":["Fabricate","Tracking"]},"career":{"category":"career-2","skills":["Dagger","Endurance"]},"hobby":{"category":"hobby-8","skills":["Driving","Repair"]}},"combatId":"fire-fingers","notes":{"trauma":"","looseEnds":"","regret":"","gear":"Keep these original gear notes"},"mana":6,"favor":1}',true);
select set_config('dcc_test.inventory_item','{"name":"Sword","kind":"weapon","quantity":1,"gearSlot":"holding","notes":"Manual bonuses"}',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','e1111111-1111-1111-1111-111111111111',true);
select set_config('dcc_test.inventory_game',public.dcc_host_game('Inventory first game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.inventory_game')::uuid,'e2222222-2222-2222-2222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.inventory_game')::uuid,'e3333333-3333-3333-3333-333333333333');
select set_config('dcc_test.inventory_other_game',public.dcc_host_game('Inventory second game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.inventory_other_game')::uuid,'e2222222-2222-2222-2222-222222222222');
select set_config('request.jwt.claim.sub','e2222222-2222-2222-2222-222222222222',true);
select public.dcc_save_profile(1,'Reusable wizard',current_setting('dcc_test.inventory_profile')::jsonb);
select set_config('dcc_test.inventory_profile_version',(select version::text from public.dcc_crawler_profiles where slot=1),true);
select public.dcc_use_crawler_profile(current_setting('dcc_test.inventory_game')::uuid,1,current_setting('dcc_test.inventory_profile_version')::uuid);
select public.dcc_use_crawler_profile(current_setting('dcc_test.inventory_other_game')::uuid,1,current_setting('dcc_test.inventory_profile_version')::uuid);
select set_config('dcc_test.inventory_crawler',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.inventory_game')::uuid),true);
select set_config('dcc_test.inventory_version',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid),true);
select set_config('dcc_test.inventory_potion',(select inventory->0->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid),true);
do $$ begin
  if (select count(*) from public.dcc_crawlers where inventory->0->>'quantity'='5')<>2 then raise exception 'Each new spellcaster must receive five starting potions.'; end if;
end $$;
-- With migration 006, starting potions automate. This older inventory test
-- deliberately classifies its two stacks as manual to exercise generic consume.
select set_config('request.jwt.claim.sub','e1111111-1111-1111-1111-111111111111',true);
select public.dcc_inventory_action(id,version,'classify',(inventory->0->>'id')::uuid,'{"effect":"manual"}')
  from public.dcc_crawlers where campaign_id in (current_setting('dcc_test.inventory_game')::uuid,current_setting('dcc_test.inventory_other_game')::uuid);
select set_config('request.jwt.claim.sub','e2222222-2222-2222-2222-222222222222',true);
select set_config('dcc_test.inventory_version',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid),true);
-- A use changes only this game's quantity and version, not Mana or saved builds.
select public.dcc_inventory_action(current_setting('dcc_test.inventory_crawler')::uuid,current_setting('dcc_test.inventory_version')::uuid,'consume',current_setting('dcc_test.inventory_potion')::uuid);
select pg_temp.inventory_expect_error(format('select public.dcc_inventory_action(%L,%L,%L,%L)',current_setting('dcc_test.inventory_crawler'),current_setting('dcc_test.inventory_version'),'consume',current_setting('dcc_test.inventory_potion')),'40001');
do $$ begin
  if not exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid and inventory->0->>'quantity'='4' and tutorial_profile->>'mana'='6' and current_segments=10) then raise exception 'Consume did not preserve resources.'; end if;
  if not exists(select 1 from public.dcc_crawlers where campaign_id=current_setting('dcc_test.inventory_other_game')::uuid and inventory->0->>'quantity'='5') then raise exception 'Another game inventory changed.'; end if;
  if not exists(select 1 from public.dcc_crawler_profiles where slot=1 and version=current_setting('dcc_test.inventory_profile_version')::uuid) then raise exception 'Saved profile changed.'; end if;
end $$;
-- Helpers read the latest version so each succeeding mutation is intentional.
reset role;
create function pg_temp.inventory_act(op text,item_id uuid default null,item jsonb default null,location text default null) returns void
language plpgsql security invoker as $$
declare current_version uuid;
begin
  select version into current_version from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid;
  perform public.dcc_inventory_action(current_setting('dcc_test.inventory_crawler')::uuid,current_version,op,item_id,item,location);
end;
$$;
set local role authenticated;
-- Direct writes and another player's inventory access are prohibited.
select pg_temp.inventory_expect_error('update public.dcc_crawlers set inventory=''[]''::jsonb','42501');
select pg_temp.inventory_expect_error('select dcc_private.validate_inventory(''[]''::jsonb)','42501');
select set_config('request.jwt.claim.sub','e3333333-3333-3333-3333-333333333333',true);
do $$ begin
  if exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid) then raise exception 'Another player inventory leaked.'; end if;
end $$;
select pg_temp.inventory_expect_error(format('select public.dcc_inventory_action(%L,%L,''consume'',%L)',current_setting('dcc_test.inventory_crawler'),current_setting('dcc_test.inventory_version'),current_setting('dcc_test.inventory_potion')),'42501');
select set_config('request.jwt.claim.sub','e4444444-4444-4444-4444-444444444444',true);
select pg_temp.inventory_expect_error(format('select public.dcc_inventory_action(%L,%L,''add'',null,%L::jsonb)',current_setting('dcc_test.inventory_crawler'),current_setting('dcc_test.inventory_version'),current_setting('dcc_test.inventory_item')),'42501');
select set_config('request.jwt.claim.sub','e2222222-2222-2222-2222-222222222222',true);
-- Bad quantities, text, locations and unknown actions are rejected in SQL too.
do $$ declare bad text; before_version uuid;
begin
  select version into before_version from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid;
  foreach bad in array array['0','-1','1.5','1000000','"2"','null'] loop
    perform pg_temp.inventory_expect_error(format('select pg_temp.inventory_act(''add'',null,%L::jsonb)',jsonb_set(current_setting('dcc_test.inventory_item')::jsonb,'{quantity}',bad::jsonb)),'22023');
  end loop;
  perform pg_temp.inventory_expect_error('select pg_temp.inventory_act(''unknown'')','22023');
  perform pg_temp.inventory_expect_error('select pg_temp.inventory_act(''remove'',gen_random_uuid())','22023');
  perform pg_temp.inventory_expect_error(format('select pg_temp.inventory_act(''add'',null,%L::jsonb)',jsonb_set(current_setting('dcc_test.inventory_item')::jsonb,'{name}','""')),'22023');
  if (select version from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid)<>before_version then raise exception 'Rejected mutations changed the crawler version.'; end if;
end $$;
-- One item in each hand, gloves separate; two-handed conflicts in either direction.
select pg_temp.inventory_act('add',null,current_setting('dcc_test.inventory_item')::jsonb||'{"quantity":3}');
select set_config('dcc_test.inventory_sword',(select inventory->1->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid),true);
select pg_temp.inventory_act('equip',current_setting('dcc_test.inventory_sword')::uuid,null,'main-hand');
select pg_temp.inventory_act('add',null,current_setting('dcc_test.inventory_item')::jsonb||'{"name":"Shield"}');
select set_config('dcc_test.inventory_shield',(select inventory->2->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid),true);
select pg_temp.inventory_act('equip',current_setting('dcc_test.inventory_shield')::uuid,null,'off-hand');
select pg_temp.inventory_act('add',null,current_setting('dcc_test.inventory_item')::jsonb||'{"name":"Gloves","gearSlot":"hands"}');
select pg_temp.inventory_act('equip',(select (inventory->3->>'id')::uuid from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid),null,'hands');
select pg_temp.inventory_act('add',null,current_setting('dcc_test.inventory_item')::jsonb||'{"name":"Big sword","gearSlot":"two-hands"}');
select set_config('dcc_test.inventory_twohands',(select inventory->4->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid),true);
select pg_temp.inventory_expect_error(format('select pg_temp.inventory_act(''equip'',%L,null,''two-hands'')',current_setting('dcc_test.inventory_twohands')),'22023');
select pg_temp.inventory_expect_error(format('select pg_temp.inventory_act(''equip'',%L,null,''head'')',current_setting('dcc_test.inventory_sword')),'22023');
select pg_temp.inventory_expect_error(format('select pg_temp.inventory_act(''consume'',%L)',current_setting('dcc_test.inventory_sword')),'22023');
select pg_temp.inventory_act('equip',current_setting('dcc_test.inventory_sword')::uuid,null,'stored');
select pg_temp.inventory_act('equip',current_setting('dcc_test.inventory_shield')::uuid,null,'stored');
select pg_temp.inventory_act('equip',current_setting('dcc_test.inventory_twohands')::uuid,null,'two-hands');
select pg_temp.inventory_expect_error(format('select pg_temp.inventory_act(''equip'',%L,null,''main-hand'')',current_setting('dcc_test.inventory_sword')),'22023');
select pg_temp.inventory_act('equip',current_setting('dcc_test.inventory_twohands')::uuid,null,'stored');
-- Eight accessories plus a belt and cape fit; an eleventh or second belt does not.
do $$ declare n integer; gear text; new_id uuid;
begin
  for n in 1..10 loop
    gear:=case when n=9 then 'belt' when n=10 then 'cape' else 'accessory' end;
    perform pg_temp.inventory_act('add',null,current_setting('dcc_test.inventory_item')::jsonb||jsonb_build_object('name','Accessory '||n,'gearSlot',gear));
    select (inventory->(jsonb_array_length(inventory)-1)->>'id')::uuid into new_id from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid;
    perform pg_temp.inventory_act('equip',new_id,null,gear);
  end loop;
  perform pg_temp.inventory_act('add',null,current_setting('dcc_test.inventory_item')::jsonb||'{"name":"Eleventh","gearSlot":"accessory"}');
  select (inventory->(jsonb_array_length(inventory)-1)->>'id')::uuid into new_id from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid;
  perform pg_temp.inventory_expect_error(format('select pg_temp.inventory_act(''equip'',%L,null,''accessory'')',new_id),'22023');
  perform pg_temp.inventory_act('add',null,current_setting('dcc_test.inventory_item')::jsonb||'{"name":"Second belt","gearSlot":"belt"}');
  select (inventory->(jsonb_array_length(inventory)-1)->>'id')::uuid into new_id from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid;
  perform pg_temp.inventory_expect_error(format('select pg_temp.inventory_act(''equip'',%L,null,''belt'')',new_id),'22023');
end $$;
-- GM can edit another owner's inventory; changes still leave stats/resources alone.
select set_config('request.jwt.claim.sub','e1111111-1111-1111-1111-111111111111',true);
select pg_temp.inventory_act('edit',current_setting('dcc_test.inventory_sword')::uuid,current_setting('dcc_test.inventory_item')::jsonb||'{"name":"GM reviewed sword","quantity":2}');
select pg_temp.inventory_expect_error(format('select pg_temp.inventory_act(''edit'',%L,%L::jsonb)',current_setting('dcc_test.inventory_sword'),current_setting('dcc_test.inventory_item')::jsonb||'{"gearSlot":"two-hands"}'),'22023');
-- Existing resource writes invalidate open inventory forms, and vice versa.
select set_config('dcc_test.inventory_version',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid),true);
select public.dcc_tutorial_action(current_setting('dcc_test.inventory_crawler')::uuid,current_setting('dcc_test.inventory_version')::uuid,'mana-spend',1);
select pg_temp.inventory_expect_error(format('select public.dcc_inventory_action(%L,%L,''remove'',%L)',current_setting('dcc_test.inventory_crawler'),current_setting('dcc_test.inventory_version'),current_setting('dcc_test.inventory_sword')),'40001');
select set_config('dcc_test.inventory_version',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid),true);
select pg_temp.inventory_act('remove',current_setting('dcc_test.inventory_sword')::uuid);
select pg_temp.inventory_expect_error(format('select public.dcc_tutorial_action(%L,%L,''mana-spend'',1)',current_setting('dcc_test.inventory_crawler'),current_setting('dcc_test.inventory_version')),'40001');
-- Last consumable disappears; stat changes never refill inventory.
do $$ declare n integer; before_items jsonb; stats jsonb;
begin
  for n in 1..4 loop perform pg_temp.inventory_act('consume',current_setting('dcc_test.inventory_potion')::uuid); end loop;
  if exists(select 1 from public.dcc_crawlers,lateral jsonb_array_elements(inventory) item where id=current_setting('dcc_test.inventory_crawler')::uuid and item->>'id'=current_setting('dcc_test.inventory_potion')) then raise exception 'Final potion remained.'; end if;
  select inventory,tutorial_profile->'stats' into before_items,stats from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid;
  perform public.dcc_tutorial_action(current_setting('dcc_test.inventory_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid),'stats',0,stats);
  if (select inventory from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid) is distinct from before_items then raise exception 'Stats refilled inventory.'; end if;
end $$;
-- A weapon-based new crawler has no automatic gear; a prototype conversion
-- also starts empty and retains its free-text gear notes for explicit review.
select public.dcc_create_crawler(current_setting('dcc_test.inventory_game')::uuid,'e3333333-3333-3333-3333-333333333333','Prototype',10,3,5);
select public.dcc_create_tutorial(current_setting('dcc_test.inventory_game')::uuid,'e3333333-3333-3333-3333-333333333333','Converted',current_setting('dcc_test.inventory_profile')::jsonb,null,
  (select id from public.dcc_crawlers where campaign_id=current_setting('dcc_test.inventory_game')::uuid and owner_user_id='e3333333-3333-3333-3333-333333333333'),
  (select version from public.dcc_crawlers where campaign_id=current_setting('dcc_test.inventory_game')::uuid and owner_user_id='e3333333-3333-3333-3333-333333333333'),5);
select public.dcc_create_tutorial(current_setting('dcc_test.inventory_game')::uuid,auth.uid(),'GM weapon build',jsonb_set(current_setting('dcc_test.inventory_profile')::jsonb,'{combatId}','"longsword"'));
do $$ begin
  if exists(select 1 from public.dcc_crawlers where campaign_id=current_setting('dcc_test.inventory_game')::uuid and name in ('Converted','GM weapon build') and inventory<>'[]'::jsonb) then raise exception 'Unexpected automatic items.'; end if;
  if not exists(select 1 from public.dcc_crawlers where name='Converted' and tutorial_profile#>>'{notes,gear}'='Keep these original gear notes') then raise exception 'Conversion lost notes.'; end if;
end $$;
-- Deleting the campaign deletes its inventory with the crawler; profiles and
-- inventories in the account's other campaign remain.
select public.dcc_delete_game(current_setting('dcc_test.inventory_game')::uuid,'Inventory first game');
select set_config('request.jwt.claim.sub','e2222222-2222-2222-2222-222222222222',true);
do $$ begin
  if not exists(select 1 from public.dcc_crawler_profiles where slot=1) then raise exception 'Deletion removed account profile.'; end if;
  if not exists(select 1 from public.dcc_crawlers where campaign_id=current_setting('dcc_test.inventory_other_game')::uuid and inventory->0->>'quantity'='5') then raise exception 'Deletion changed other game inventory.'; end if;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.dcc_crawlers where id=current_setting('dcc_test.inventory_crawler')::uuid) then raise exception 'Deleted crawler survived.'; end if;
  if has_function_privilege('anon','public.dcc_inventory_action(uuid,uuid,text,uuid,jsonb,text)','EXECUTE') then raise exception 'Anonymous inventory writes allowed.'; end if;
end $$;
-- Storage bounds and duplicate identifiers are checked independently of the UI.
do $$ declare entries jsonb; next_entry jsonb;
begin
  select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'name','Stored item','kind','gear',
    'quantity',999999,'notes','','gearSlot','none','location','stored')) into entries from generate_series(1,200);
  perform dcc_private.validate_inventory(entries);
  next_entry:=jsonb_set(entries->0,'{id}',to_jsonb(gen_random_uuid()::text));
  perform pg_temp.inventory_expect_error(format('select dcc_private.validate_inventory(%L::jsonb)',entries||jsonb_build_array(next_entry)),'22023');
  perform pg_temp.inventory_expect_error(format('select dcc_private.validate_inventory(%L::jsonb)',jsonb_build_array(entries->0,entries->0)),'22023');
end $$;
rollback;
select 'PASS: Inventory assertions completed; fixtures rolled back.' as result;
