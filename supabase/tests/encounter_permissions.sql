-- Run as administrator after migration 014. All fixture changes roll back.
begin;
create function pg_temp.encounter_assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%', message; end if; end $$;
create function pg_temp.encounter_error(statement text, expected text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then
    if sqlstate <> expected then raise exception 'Expected %, got %: %', expected, sqlstate, sqlerrm; end if;
    return;
  end;
  raise exception 'Unexpected success: %', statement;
end $$;
create function pg_temp.encounter_act(op text, participant uuid default null, name text default null, initiative integer default null) returns void
language plpgsql security invoker as $$
begin
  perform public.dcc_encounter_action(current_setting('dcc_test.encounter_game')::uuid,
    (select version from public.dcc_encounters where campaign_id = current_setting('dcc_test.encounter_game')::uuid),
    op, participant, name, initiative);
end $$;
insert into auth.users(id,email,email_confirmed_at) values
  ('f1111111-1111-4111-8111-111111111111','encounter-gm@example.invalid',now()),
  ('f2222222-2222-4222-8222-222222222222','encounter-player@example.invalid',now());
select set_config('dcc_test.encounter_profile','{"version":1,"pronouns":"","method":"array","initialStats":{"strength":2,"intelligence":6,"constitution":3,"dexterity":5,"charisma":4},"stats":{"strength":{"base":2,"enhanced":2},"intelligence":{"base":6,"enhanced":6},"constitution":{"base":3,"enhanced":3},"dexterity":{"base":5,"enhanced":5},"charisma":{"base":4,"enhanced":4}},"backgrounds":{"childhood":{"category":"childhood-1","skills":["Streetwise","Perception"]},"adolescence":{"category":"adolescence-1","skills":["Fabricate","Tracking"]},"career":{"category":"career-2","skills":["Dagger","Endurance"]},"hobby":{"category":"hobby-8","skills":["Driving","Repair"]}},"combatId":"fire-fingers","notes":{"trauma":"","looseEnds":"","regret":"","gear":""},"mana":6,"favor":1}',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','f1111111-1111-4111-8111-111111111111',true);
select set_config('dcc_test.encounter_game',public.dcc_host_game('Encounter test game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.encounter_game')::uuid,'f2222222-2222-4222-8222-222222222222');
select set_config('dcc_test.encounter_other',public.dcc_host_game('Other game')::text,true);
select set_config('request.jwt.claim.sub','f2222222-2222-4222-8222-222222222222',true);
select public.dcc_save_profile(1,'Crawler',current_setting('dcc_test.encounter_profile')::jsonb);
select public.dcc_use_crawler_profile(current_setting('dcc_test.encounter_game')::uuid,1,
  (select version from public.dcc_crawler_profiles where slot=1));
select set_config('dcc_test.encounter_crawler',
  (select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.encounter_game')::uuid),true);
select pg_temp.encounter_error('select pg_temp.encounter_act(''start'')','42501');
select pg_temp.encounter_assert(not exists(select 1 from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Player read GM encounter.');
select pg_temp.encounter_error('insert into public.dcc_encounters(campaign_id) values (current_setting(''dcc_test.encounter_game'')::uuid)','42501');
select set_config('request.jwt.claim.sub','f1111111-1111-4111-8111-111111111111',true);
select pg_temp.encounter_act('start');
select pg_temp.encounter_assert((select active and round=1 and participants='[]'::jsonb from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Encounter start failed.');
select pg_temp.encounter_error(format('select public.dcc_encounter_action(%L,%L,''end'')',
  current_setting('dcc_test.encounter_game'),'00000000-0000-4000-8000-000000000000'),'40001');
select pg_temp.encounter_act('add-crawler',current_setting('dcc_test.encounter_crawler')::uuid,null,20);
select pg_temp.encounter_act('add-monster',null,'Goblin',10);
select pg_temp.encounter_assert((select participants->0->>'id'=current_setting('dcc_test.encounter_crawler')
  and participants->1->>'name'='Goblin' and current_participant_id is null
  from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Participants or initiative order incorrect.');
select pg_temp.encounter_error(format('select pg_temp.encounter_act(''add-crawler'',%L,null,1)',current_setting('dcc_test.encounter_crawler')),'22023');
select pg_temp.encounter_error('select pg_temp.encounter_act(''add-monster'',null,''Bad'',1001)','22023');
select public.dcc_encounter_action(current_setting('dcc_test.encounter_other')::uuid,null,'start');
select pg_temp.encounter_error(format('select public.dcc_encounter_action(%L,(select version from public.dcc_encounters where campaign_id=%L),''add-crawler'',%L,null,1)',
  current_setting('dcc_test.encounter_other'),current_setting('dcc_test.encounter_other'),current_setting('dcc_test.encounter_crawler')),'22023');
select public.dcc_effect_action(current_setting('dcc_test.encounter_crawler')::uuid,
  (select version from public.dcc_crawlers where id=current_setting('dcc_test.encounter_crawler')::uuid),
  'add',jsonb_build_object('definition',jsonb_build_object('name','Short buff','kind','buff','source','Encounter test',
  'notes','','active',true,'remainingRounds',1,'modifiers','{"strength":1,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0}'::jsonb,'defenses','{}'::jsonb)));
select pg_temp.encounter_act('next');
select pg_temp.encounter_assert((select round=1 and current_participant_id::text=current_setting('dcc_test.encounter_crawler') from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Turns did not start at highest initiative.');
select pg_temp.encounter_act('next');
select pg_temp.encounter_assert((select round=1 and current_participant_id::text=participants->1->>'id' from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Turn did not advance within round.');
select pg_temp.encounter_assert((select tracked_effects->0->>'remainingRounds'='1' from public.dcc_crawlers where id=current_setting('dcc_test.encounter_crawler')::uuid),'Effect expired before round end.');
select pg_temp.encounter_act('next');
select pg_temp.encounter_assert((select round=2 and current_participant_id::text=current_setting('dcc_test.encounter_crawler') from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Round did not wrap.');
select pg_temp.encounter_assert((select tracked_effects->0->>'remainingRounds'='0' and tracked_effects->0->>'active'='false' from public.dcc_crawlers where id=current_setting('dcc_test.encounter_crawler')::uuid),'Participating crawler effect did not expire.');
select pg_temp.encounter_act('initiative',current_setting('dcc_test.encounter_crawler')::uuid,null,0);
select pg_temp.encounter_assert((select participants->1->>'id'=current_setting('dcc_test.encounter_crawler')
  and current_participant_id::text=current_setting('dcc_test.encounter_crawler') from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Initiative reorder lost current turn.');
select pg_temp.encounter_act('remove',current_setting('dcc_test.encounter_crawler')::uuid);
select pg_temp.encounter_assert((select jsonb_array_length(participants)=1 and current_participant_id::text=participants->0->>'id' from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Removal did not select a valid turn.');
select pg_temp.encounter_act('end');
select pg_temp.encounter_assert((select not active from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Encounter did not end.');
select pg_temp.encounter_act('start');
select pg_temp.encounter_assert((select active and round=1 and participants='[]'::jsonb from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'New encounter did not reset.');
reset role;
select 'PASS: encounter permissions, versions, turn order, round effects and reset' as result;
rollback;
