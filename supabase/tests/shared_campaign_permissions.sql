-- Run as postgres in the Supabase SQL Editor AFTER the migration and BEFORE
-- bootstrapping a real campaign. Fixtures and changes are rolled back.
-- If any statement fails, run ROLLBACK before fixing/retrying.
begin;
do $$ begin
  if exists (select 1 from public.dcc_campaigns) then
    raise exception 'Run this test before seeding the campaign, or in a separate test project.';
  end if;
  if has_table_privilege('authenticated', 'public.dcc_crawlers', 'UPDATE') then
    raise exception 'Authenticated users must not have raw table write privileges.';
  end if;
  if has_function_privilege('anon', 'public.dcc_change_health(uuid,uuid,bigint)', 'EXECUTE') then
    raise exception 'Anonymous users must not execute campaign writes.';
  end if;
end $$;

insert into auth.users(id, email, email_confirmed_at) values
  ('11111111-1111-1111-1111-111111111111', 'dcc-test-gm@example.invalid', now()),
  ('22222222-2222-2222-2222-222222222222', 'dcc-test-alice@example.invalid', now()),
  ('33333333-3333-3333-3333-333333333333', 'dcc-test-bob@example.invalid', now()),
  ('44444444-4444-4444-4444-444444444444', 'dcc-test-outsider@example.invalid', now()),
  ('99999999-9999-9999-9999-999999999999', 'dcc-test-unconfirmed@example.invalid', null);
insert into public.dcc_campaigns(id, name, gm_user_id) values
  ('77777777-7777-7777-7777-777777777777', 'Permission test', '11111111-1111-1111-1111-111111111111');

-- These settings simulate API identities only inside this administrator-run
-- SQL test. The application uses verified Supabase sessions instead.
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select public.dcc_add_player('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222');
select public.dcc_add_player('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333');
select public.dcc_create_crawler('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'Carl', 10, 10);
select public.dcc_create_crawler('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'Donut', 10, 10);

do $$ begin
  if (select count(*) from public.dcc_crawlers) <> 2 then raise exception 'GM must see all crawlers.'; end if;
  if (select count(*) from public.dcc_campaign_members) <> 2 then raise exception 'GM must see the player roster.'; end if;
  begin
    perform public.dcc_add_player('77777777-7777-7777-7777-777777777777', '99999999-9999-9999-9999-999999999999');
    raise exception 'Unconfirmed account was accepted.';
  exception when invalid_parameter_value then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$ declare v_id uuid; v_version uuid; begin
  if (select count(*) from public.dcc_crawlers) <> 1 then raise exception 'Player must see only one owned crawler.'; end if;
  if (select count(*) from public.dcc_campaign_members) <> 1 then raise exception 'Player must not see other memberships.'; end if;
  if exists(select 1 from public.dcc_crawlers where name = 'Donut') then raise exception 'Other crawler data leaked.'; end if;
  select id, version into v_id, v_version from public.dcc_crawlers where name = 'Carl';
  begin
    perform public.dcc_update_stats(v_id, v_version, 20, 14);
    raise exception 'Player changed protected stats.';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.dcc_crawlers set base_segments = 20 where id = v_id;
    raise exception 'Player bypassed commands with a direct UPDATE.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.dcc_add_player('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444');
    raise exception 'Player added a member.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.dcc_create_crawler('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'Forged', 10, 10);
    raise exception 'Player created for another owner.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.dcc_create_crawler('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'Replacement', 100, 100);
    raise exception 'Player replaced locked stats by creating again.';
  exception when unique_violation then null;
  end;
  perform public.dcc_change_health(v_id, v_version, -3);
  begin
    perform public.dcc_change_health(v_id, v_version, -3);
    raise exception 'A stale version was accepted.';
  exception when serialization_failure then null;
  end;
  if (select current_segments from public.dcc_crawlers where id = v_id) <> 7 then raise exception 'Damage was not applied exactly once.'; end if;
end $$;

-- Obtain Bob's ID as the administrator, then restore Alice to exercise an
-- explicit foreign ID request rather than just testing hidden SELECT rows.
reset role;
select set_config('dcc_test.foreign_id', (select id::text from public.dcc_crawlers where name = 'Donut'), true);
select set_config('dcc_test.foreign_version', (select version::text from public.dcc_crawlers where name = 'Donut'), true);
set local role authenticated;
do $$ begin
  begin
    perform public.dcc_change_health(current_setting('dcc_test.foreign_id')::uuid, current_setting('dcc_test.foreign_version')::uuid, -1);
    raise exception 'Player changed another crawler by ID.';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $$ declare v_id uuid; v_version uuid; begin
  select id, version into v_id, v_version from public.dcc_crawlers where name = 'Carl';
  perform public.dcc_update_stats(v_id, v_version, 20, 14);
  if (select current_segments from public.dcc_crawlers where id = v_id) <> 7 then raise exception 'Stat increase healed the crawler.'; end if;
  select version into v_version from public.dcc_crawlers where id = v_id;
  perform public.dcc_update_stats(v_id, v_version, 5, 10);
  if (select current_segments from public.dcc_crawlers where id = v_id) <> 5 then raise exception 'Stat reduction did not clamp health.'; end if;
  select version into v_version from public.dcc_crawlers where id = v_id;
  perform public.dcc_change_health(v_id, v_version, -100);
  select version into v_version from public.dcc_crawlers where id = v_id;
  perform public.dcc_update_stats(v_id, v_version, 20, 14);
  if (select current_segments from public.dcc_crawlers where id = v_id) <> 0 then raise exception 'Stat update revived a zero-health crawler.'; end if;
  -- A negative odd modifier must floor, rather than truncate toward zero.
  perform public.dcc_create_crawler('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'GM crawler', 10, 9);
  if (select max_segments from public.dcc_crawlers where name = 'GM crawler') <> 9 then raise exception 'SQL health rule diverged from the domain.'; end if;
end $$;

select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
do $$ begin
  if (select count(*) from public.dcc_campaigns) <> 0 or (select count(*) from public.dcc_crawlers) <> 0 then
    raise exception 'A non-member saw campaign data.';
  end if;
  begin
    perform public.dcc_create_crawler('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Outsider', 10, 10);
    raise exception 'A non-member created a crawler.';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;
select 'PASS: shared campaign database assertions completed; fixtures rolled back.' as result;
