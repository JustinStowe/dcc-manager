-- Run as administrator after migration 016. All fixture changes roll back.
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
create function pg_temp.encounter_act(op text, participant uuid default null, name text default null, initiative integer default null, mode text default null) returns void
language plpgsql security invoker as $$
begin
  perform public.dcc_encounter_action(current_setting('dcc_test.encounter_game')::uuid,
    (select version from public.dcc_encounters where campaign_id = current_setting('dcc_test.encounter_game')::uuid),
    op, participant, name, initiative, mode);
end $$;
insert into auth.users(id,email,email_confirmed_at) values
  ('f1111111-1111-4111-8111-111111111111','encounter-gm@example.invalid',now()),
  ('f2222222-2222-4222-8222-222222222222','encounter-player@example.invalid',now()),
  ('f3333333-3333-4333-8333-333333333333','encounter-second-player@example.invalid',now());
select set_config('dcc_test.encounter_profile','{"version":1,"pronouns":"","method":"array","initialStats":{"strength":2,"intelligence":6,"constitution":3,"dexterity":5,"charisma":4},"stats":{"strength":{"base":2,"enhanced":2},"intelligence":{"base":6,"enhanced":6},"constitution":{"base":3,"enhanced":3},"dexterity":{"base":5,"enhanced":5},"charisma":{"base":4,"enhanced":4}},"backgrounds":{"childhood":{"category":"childhood-1","skills":["Streetwise","Perception"]},"adolescence":{"category":"adolescence-1","skills":["Fabricate","Tracking"]},"career":{"category":"career-2","skills":["Dagger","Endurance"]},"hobby":{"category":"hobby-8","skills":["Driving","Repair"]}},"combatId":"fire-fingers","notes":{"trauma":"","looseEnds":"","regret":"","gear":""},"mana":6,"favor":1}',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','f1111111-1111-4111-8111-111111111111',true);
select set_config('dcc_test.encounter_game',public.dcc_host_game('Encounter test game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.encounter_game')::uuid,'f2222222-2222-4222-8222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.encounter_game')::uuid,'f3333333-3333-4333-8333-333333333333');
select set_config('dcc_test.encounter_other',public.dcc_host_game('Other game')::text,true);
select set_config('request.jwt.claim.sub','f2222222-2222-4222-8222-222222222222',true);
select public.dcc_save_profile(1,'Crawler',current_setting('dcc_test.encounter_profile')::jsonb);
select public.dcc_use_crawler_profile(current_setting('dcc_test.encounter_game')::uuid,1,
  (select version from public.dcc_crawler_profiles where slot=1));
select set_config('dcc_test.encounter_crawler',
  (select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.encounter_game')::uuid),true);
select set_config('request.jwt.claim.sub','f3333333-3333-4333-8333-333333333333',true);
select public.dcc_save_profile(1,'Second crawler',current_setting('dcc_test.encounter_profile')::jsonb);
select public.dcc_use_crawler_profile(current_setting('dcc_test.encounter_game')::uuid,1,
  (select version from public.dcc_crawler_profiles where slot=1));
select set_config('dcc_test.encounter_second',
  (select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.encounter_game')::uuid and owner_user_id='f3333333-3333-4333-8333-333333333333'),true);
select set_config('request.jwt.claim.sub','f2222222-2222-4222-8222-222222222222',true);
select pg_temp.encounter_error('select pg_temp.encounter_act(''start'')','42501');
select pg_temp.encounter_assert(not exists(select 1 from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Player read GM encounter.');
select pg_temp.encounter_error('insert into public.dcc_encounters(campaign_id) values (current_setting(''dcc_test.encounter_game'')::uuid)','42501');
select set_config('request.jwt.claim.sub','f1111111-1111-4111-8111-111111111111',true);
select pg_temp.encounter_act('start',null,null,null,'mob');
select pg_temp.encounter_assert((select active and mode='mob' and phase='mob-declaration' and round=1 and participants='[]'::jsonb from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Mob encounter start failed.');
select pg_temp.encounter_error(format('select public.dcc_encounter_action(%L,%L,''end'')',
  current_setting('dcc_test.encounter_game'),'00000000-0000-4000-8000-000000000000'),'40001');
select pg_temp.encounter_act('add-crawler',current_setting('dcc_test.encounter_crawler')::uuid);
select pg_temp.encounter_act('add-monster',null,'Goblin');
select pg_temp.encounter_assert((select participants->0->>'id'=current_setting('dcc_test.encounter_crawler')
  and participants->1->>'name'='Goblin' and participants->0->'initiative'='null'::jsonb and current_participant_id is null
  from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Mob roster or no-initiative rule incorrect.');
select pg_temp.encounter_error(format('select pg_temp.encounter_act(''add-crawler'',%L)',current_setting('dcc_test.encounter_crawler')),'22023');
select pg_temp.encounter_error('select pg_temp.encounter_act(''add-monster'',null,repeat(''X'',101))','22023');
select pg_temp.encounter_error(format('select pg_temp.encounter_act(''initiative'',%L,null,12)',current_setting('dcc_test.encounter_crawler')),'22023');
select public.dcc_encounter_action(current_setting('dcc_test.encounter_other')::uuid,null,'start',null,null,null,'mob');
select pg_temp.encounter_error(format('select public.dcc_encounter_action(%L,(select version from public.dcc_encounters where campaign_id=%L),''add-crawler'',%L)',
  current_setting('dcc_test.encounter_other'),current_setting('dcc_test.encounter_other'),current_setting('dcc_test.encounter_crawler')),'22023');
select public.dcc_effect_action(current_setting('dcc_test.encounter_crawler')::uuid,
  (select version from public.dcc_crawlers where id=current_setting('dcc_test.encounter_crawler')::uuid),
  'add',jsonb_build_object('definition',jsonb_build_object('name','Short buff','kind','buff','source','Encounter test',
  'notes','','active',true,'remainingRounds',1,'modifiers','{"strength":1,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0}'::jsonb,'defenses','{}'::jsonb)));
select pg_temp.encounter_act('next');
select pg_temp.encounter_assert((select round=1 and phase='crawler-reaction' from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Crawler reaction phase missing.');
select pg_temp.encounter_act('next');
select pg_temp.encounter_assert((select round=1 and phase='mob-resolution' from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Mob resolution phase missing.');
select pg_temp.encounter_act('next');
select pg_temp.encounter_assert((select phase='crawler-action' from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Crawler action phase missing.');
select pg_temp.encounter_act('next');
select pg_temp.encounter_assert((select phase='cleanup' from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Clean up phase missing.');
select pg_temp.encounter_assert((select tracked_effects->0->>'remainingRounds'='1' from public.dcc_crawlers where id=current_setting('dcc_test.encounter_crawler')::uuid),'Effect expired before round end.');
select pg_temp.encounter_act('next');
select pg_temp.encounter_assert((select round=2 and phase='mob-declaration' from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Mob round did not wrap.');
select pg_temp.encounter_assert((select tracked_effects->0->>'remainingRounds'='0' and tracked_effects->0->>'active'='false' from public.dcc_crawlers where id=current_setting('dcc_test.encounter_crawler')::uuid),'Participating crawler effect did not expire.');
select pg_temp.encounter_act('end');
select pg_temp.encounter_assert((select not active from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Encounter did not end.');
select pg_temp.encounter_act('start',null,null,null,'pvp');
select pg_temp.encounter_assert((select active and mode='pvp' and phase is null and round=1 and participants='[]'::jsonb from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'PvP encounter did not reset.');
select pg_temp.encounter_error('select pg_temp.encounter_act(''add-monster'',null,''Goblin'')','22023');
select pg_temp.encounter_act('add-crawler',current_setting('dcc_test.encounter_crawler')::uuid);
select pg_temp.encounter_act('add-crawler',current_setting('dcc_test.encounter_second')::uuid);
select pg_temp.encounter_error('select pg_temp.encounter_act(''next'')','22023');
select pg_temp.encounter_act('initiative',current_setting('dcc_test.encounter_crawler')::uuid,null,17);
select pg_temp.encounter_act('initiative',current_setting('dcc_test.encounter_second')::uuid,null,17);
select pg_temp.encounter_act('next');
select pg_temp.encounter_assert((select current_participant_id is not null and round=1 from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'PvP turns did not start.');
select pg_temp.encounter_act('next');
select pg_temp.encounter_assert((select round=2 and current_participant_id is null and participants->0->'initiative'='null'::jsonb and participants->1->'initiative'='null'::jsonb from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Tied PvP crawlers did not act simultaneously or reroll next round.');
select pg_temp.encounter_error('select pg_temp.encounter_act(''next'')','22023');
select pg_temp.encounter_act('initiative',current_setting('dcc_test.encounter_crawler')::uuid,null,10);
select pg_temp.encounter_act('initiative',current_setting('dcc_test.encounter_second')::uuid,null,15);
select pg_temp.encounter_act('next');
select pg_temp.encounter_assert((select current_participant_id::text=current_setting('dcc_test.encounter_second') from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Higher PvP total did not act first.');
select pg_temp.encounter_act('next');
select pg_temp.encounter_assert((select current_participant_id::text=current_setting('dcc_test.encounter_crawler') from public.dcc_encounters where campaign_id=current_setting('dcc_test.encounter_game')::uuid),'Lower PvP total did not act second.');
reset role;
select 'PASS: encounter permissions, Mob phases, PvP ties and rerolls, round effects' as result;
rollback;
