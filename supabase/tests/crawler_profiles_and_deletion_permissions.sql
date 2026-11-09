begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('d1111111-1111-1111-1111-111111111111','profile-gm@example.invalid',now()),
 ('d2222222-2222-2222-2222-222222222222','profile-alice@example.invalid',now()),
 ('d3333333-3333-3333-3333-333333333333','profile-bob@example.invalid',now());
select set_config('dcc_test.profile','{"version":1,"pronouns":"","method":"array","initialStats":{"strength":2,"intelligence":6,"constitution":3,"dexterity":5,"charisma":4},"stats":{"strength":{"base":2,"enhanced":2},"intelligence":{"base":6,"enhanced":6},"constitution":{"base":3,"enhanced":3},"dexterity":{"base":5,"enhanced":5},"charisma":{"base":4,"enhanced":4}},"backgrounds":{"childhood":{"category":"childhood-1","skills":["Streetwise","Perception"]},"adolescence":{"category":"adolescence-1","skills":["Fabricate","Tracking"]},"career":{"category":"career-2","skills":["Dagger","Endurance"]},"hobby":{"category":"hobby-8","skills":["Driving","Repair"]}},"combatId":"longsword","notes":{"trauma":"","looseEnds":"","regret":"","gear":""},"mana":6,"favor":1}',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','d1111111-1111-1111-1111-111111111111',true);
select set_config('dcc_test.game',public.dcc_host_game('Delete test game')::text,true);
select set_config('dcc_test.code',public.dcc_host_settings(current_setting('dcc_test.game')::uuid)->>'code',true);
select public.dcc_add_player(current_setting('dcc_test.game')::uuid,'d2222222-2222-2222-2222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.game')::uuid,'d3333333-3333-3333-3333-333333333333');

select set_config('request.jwt.claim.sub','d2222222-2222-2222-2222-222222222222',true);
select public.dcc_save_profile(1,'Carl',current_setting('dcc_test.profile')::jsonb);
select public.dcc_save_profile(2,'Second',current_setting('dcc_test.profile')::jsonb);
select public.dcc_save_profile(3,'Third',current_setting('dcc_test.profile')::jsonb);
select set_config('dcc_test.version',(select version::text from public.dcc_crawler_profiles where slot=1),true);
do $$ begin
  if (select count(*) from public.dcc_crawler_profiles)<>3 then raise exception 'Wrong profile count.'; end if;
  begin
    perform public.dcc_save_profile(4,'Fourth',current_setting('dcc_test.profile')::jsonb);
    raise exception 'Fourth profile accepted.';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.dcc_save_profile(1,'Overwrite',current_setting('dcc_test.profile')::jsonb);
    raise exception 'Stale or concurrent save overwrote a profile.';
  exception when serialization_failure then null; end;
  begin
    insert into public.dcc_crawler_profiles(owner_user_id,slot,name,profile)
      values(auth.uid(),1,'Direct write',current_setting('dcc_test.profile')::jsonb);
    raise exception 'Direct profile write allowed.';
  exception when insufficient_privilege then null; end;
  begin
    perform public.dcc_delete_game(current_setting('dcc_test.game')::uuid,'Delete test game');
    raise exception 'Player deleted a game.';
  exception when insufficient_privilege then null; end;
end $$;
select public.dcc_use_crawler_profile(current_setting('dcc_test.game')::uuid,1,current_setting('dcc_test.version')::uuid);
do $$ begin
  if not exists(select 1 from public.dcc_crawlers where name='Carl' and current_segments=10 and max_segments=10) then
    raise exception 'Saved profile did not create a full-health game crawler.';
  end if;
end $$;
select public.dcc_save_profile(1,'Edited Carl',current_setting('dcc_test.profile')::jsonb,null,current_setting('dcc_test.version')::uuid);
do $$ begin
  if not exists(select 1 from public.dcc_crawlers where name='Carl') then raise exception 'Profile edit changed the game crawler.'; end if;
end $$;

select set_config('request.jwt.claim.sub','d3333333-3333-3333-3333-333333333333',true);
do $$ begin
  if exists(select 1 from public.dcc_crawler_profiles) then raise exception 'Another account profile leaked.'; end if;
  begin
    perform public.dcc_use_crawler_profile(current_setting('dcc_test.game')::uuid,1,current_setting('dcc_test.version')::uuid);
    raise exception 'Another account profile was used.';
  exception when serialization_failure then null; end;
  begin
    perform public.dcc_save_profile(1,'Forged roll',jsonb_set(current_setting('dcc_test.profile')::jsonb,'{method}','"rolled"'),gen_random_uuid());
    raise exception 'Forged rolled stats were saved.';
  exception when invalid_parameter_value then null; end;
end $$;
select set_config('dcc_test.roll',public.dcc_roll_profile(1)::text,true);
do $$ declare saved_roll jsonb := current_setting('dcc_test.roll')::jsonb; profile jsonb := current_setting('dcc_test.profile')::jsonb; stats jsonb := '{}'; stat_key text;
begin
  if public.dcc_roll_profile(1) is distinct from saved_roll then raise exception 'Profile roll changed on retry.'; end if;
  foreach stat_key in array array['strength','intelligence','constitution','dexterity','charisma'] loop
    stats := stats || jsonb_build_object(stat_key,jsonb_build_object('base',saved_roll#>array['scores',stat_key],'enhanced',saved_roll#>array['scores',stat_key]));
  end loop;
  profile := profile || jsonb_build_object('method','rolled','initialStats',saved_roll->'scores','stats',stats,'mana',saved_roll#>'{scores,intelligence}');
  perform public.dcc_save_profile(1,'Rolled Bob',profile,(saved_roll->>'id')::uuid);
  perform public.dcc_use_crawler_profile(current_setting('dcc_test.game')::uuid,1,(select version from public.dcc_crawler_profiles where slot=1));
  if not exists(select 1 from public.dcc_crawlers where name='Rolled Bob' and tutorial_profile->'initialStats'=saved_roll->'scores') then
    raise exception 'Saved server rolls did not survive game entry.';
  end if;
end $$;

select set_config('request.jwt.claim.sub','d1111111-1111-1111-1111-111111111111',true);
select public.dcc_save_profile(1,'GM profile',current_setting('dcc_test.profile')::jsonb);
do $$ begin
  begin
    perform public.dcc_create_tutorial_and_save(current_setting('dcc_test.game')::uuid,auth.uid(),'Atomic conflict',current_setting('dcc_test.profile')::jsonb,null,1);
    raise exception 'Occupied slot was overwritten.';
  exception when serialization_failure then null; end;
  if exists(select 1 from public.dcc_crawlers where owner_user_id=auth.uid()) then raise exception 'Failed optional save left a game crawler behind.'; end if;
end $$;
select public.dcc_create_tutorial_and_save(current_setting('dcc_test.game')::uuid,auth.uid(),'GM crawler',current_setting('dcc_test.profile')::jsonb,null,2);
do $$ begin
  begin
    perform public.dcc_delete_game(current_setting('dcc_test.game')::uuid,'wrong name');
    raise exception 'Game deleted without exact name.';
  exception when invalid_parameter_value then null; end;
end $$;
select public.dcc_delete_game(current_setting('dcc_test.game')::uuid,'Delete test game');
do $$ begin
  if exists(select 1 from public.dcc_campaigns where id=current_setting('dcc_test.game')::uuid) then raise exception 'Game was not deleted.'; end if;
  if (select count(*) from public.dcc_crawler_profiles)<>2 then raise exception 'Game deletion removed GM account profiles.'; end if;
end $$;

select set_config('request.jwt.claim.sub','d2222222-2222-2222-2222-222222222222',true);
do $$ begin
  if (select count(*) from public.dcc_crawler_profiles)<>3 then raise exception 'Game deletion removed player profiles.'; end if;
end $$;
select public.dcc_delete_profile(1,(select version from public.dcc_crawler_profiles where slot=1));
select public.dcc_save_profile(1,'Replacement',current_setting('dcc_test.profile')::jsonb);
reset role;
do $$ begin
  if exists(select 1 from public.dcc_crawlers where campaign_id=current_setting('dcc_test.game')::uuid) or
    exists(select 1 from public.dcc_campaign_members where campaign_id=current_setting('dcc_test.game')::uuid) or
    exists(select 1 from dcc_private.game_codes where campaign_id=current_setting('dcc_test.game')::uuid) or
    exists(select 1 from dcc_private.tutorial_rolls where campaign_id=current_setting('dcc_test.game')::uuid) then
    raise exception 'Deleted game left dependent data.';
  end if;
  if has_function_privilege('anon','public.dcc_delete_game(uuid,text)','EXECUTE') or
    has_function_privilege('anon','public.dcc_save_profile(integer,text,jsonb,uuid,uuid)','EXECUTE') then
    raise exception 'Anonymous write access allowed.';
  end if;
end $$;
rollback;
select 'PASS: Account profile and game deletion assertions completed; fixtures rolled back.' as result;