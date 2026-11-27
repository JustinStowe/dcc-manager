-- Included inside a test transaction; requires isolated local test auth fixtures.
insert into auth.users(id,email,email_confirmed_at)values
 ('c1911111-1111-4111-8111-111111111111','progression-gm@example.invalid',now()),
 ('c1922222-2222-4222-8222-222222222222','progression-player@example.invalid',now()),
 ('c1933333-3333-4333-8333-333333333333','progression-other@example.invalid',now());
select set_config('dcc_test.pg_profile','{"version":1,"pronouns":"","method":"array","initialStats":{"strength":2,"intelligence":6,"constitution":3,"dexterity":5,"charisma":4},"stats":{"strength":{"base":2,"enhanced":2},"intelligence":{"base":6,"enhanced":6},"constitution":{"base":3,"enhanced":3},"dexterity":{"base":5,"enhanced":5},"charisma":{"base":4,"enhanced":4}},"backgrounds":{"childhood":{"category":"childhood-1","skills":["Streetwise","Perception"]},"adolescence":{"category":"adolescence-1","skills":["Fabricate","Tracking"]},"career":{"category":"career-2","skills":["Dagger","Endurance"]},"hobby":{"category":"hobby-8","skills":["Driving","Repair"]}},"combatId":"fire-fingers","notes":{"trauma":"","looseEnds":"","regret":"","gear":""},"mana":6,"favor":1}',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','c1911111-1111-4111-8111-111111111111',true);
select set_config('dcc_test.pg_game',public.dcc_host_game('Progression test')::text,true);
select public.dcc_add_player(current_setting('dcc_test.pg_game')::uuid,'c1922222-2222-4222-8222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.pg_game')::uuid,'c1933333-3333-4333-8333-333333333333');
select set_config('request.jwt.claim.sub','c1922222-2222-4222-8222-222222222222',true);
select public.dcc_save_profile(1,'Progression crawler',current_setting('dcc_test.pg_profile')::jsonb);
select public.dcc_use_crawler_profile(current_setting('dcc_test.pg_game')::uuid,1,(select version from public.dcc_crawler_profiles where slot=1));
select set_config('dcc_test.pg_id',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.pg_game')::uuid),true);
reset role;
update public.dcc_crawlers set dungeon_floor=3,crawler_level=9,current_segments=0,tutorial_profile=jsonb_set(tutorial_profile,'{mana}','2')where id=current_setting('dcc_test.pg_id')::uuid;
do $$begin
 if to_regprocedure('public.dcc_selection_menu_action(uuid,text,jsonb)')is not null then
  perform set_config('request.jwt.claim.sub','c1911111-1111-4111-8111-111111111111',true);
  perform public.dcc_selection_menu_action(current_setting('dcc_test.pg_game')::uuid,'push','{"floor":3}');
 end if;
end$$;
create function pg_temp.pg_assert(ok boolean,message text)returns void language plpgsql as $$begin if ok is distinct from true then raise exception '%',message;end if;end$$;
create function pg_temp.pg_error(statement text,expected text)returns void language plpgsql as $$begin begin execute statement;exception when others then if sqlstate<>expected then raise exception 'Expected %, got %: %',expected,sqlstate,sqlerrm;end if;return;end;raise exception 'Unexpected success: %',statement;end$$;
create function pg_temp.pg_act(op text,payload jsonb)returns void language plpgsql as $$begin perform public.dcc_progression_action(current_setting('dcc_test.pg_id')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.pg_id')::uuid),op,jsonb_build_object('confirmed',true,'reason','Reviewed by the table')||payload);end$$;
