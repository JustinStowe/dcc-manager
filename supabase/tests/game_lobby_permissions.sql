-- Run as postgres after BOTH migrations. Existing games are not deleted or
-- replaced. All fixture records and changes are rolled back.
-- Stop on any error and run ROLLBACK before retrying.
begin;
do $$ begin
  if exists (select 1 from public.dcc_campaigns c left join dcc_private.game_codes gc on gc.campaign_id = c.id where gc.campaign_id is null) then
    raise exception 'An existing campaign is missing its migrated Game Code.';
  end if;
end $$;
insert into auth.users(id, email, email_confirmed_at) values
  ('b1111111-1111-1111-1111-111111111111', 'lobby-test-gm@example.invalid', now()),
  ('b2222222-2222-2222-2222-222222222222', 'lobby-test-alice@example.invalid', now()),
  ('b3333333-3333-3333-3333-333333333333', 'lobby-test-bob@example.invalid', now()),
  ('b4444444-4444-4444-4444-444444444444', 'lobby-test-unconfirmed@example.invalid', null);

do $$ begin
  if has_table_privilege('authenticated', 'dcc_private.game_codes', 'SELECT') then raise exception 'Players must not read the code table.'; end if;
  if has_table_privilege('authenticated', 'public.dcc_crawlers', 'UPDATE') then raise exception 'Direct crawler writes must be denied.'; end if;
  if has_function_privilege('anon', 'public.dcc_host_game(text)', 'EXECUTE') or
     has_function_privilege('anon', 'public.dcc_join_game(text)', 'EXECUTE') then
    raise exception 'Anonymous game operations must be denied.';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1111111-1111-1111-1111-111111111111', true);
select set_config('dcc_test.game_one', public.dcc_host_game('Lobby test one')::text, true);
select set_config('dcc_test.game_two', public.dcc_host_game('Lobby test two')::text, true);
select set_config('dcc_test.code_one', public.dcc_host_settings(current_setting('dcc_test.game_one')::uuid)->>'code', true);

do $$ begin
  if (select count(*) from public.dcc_campaigns) <> 2 then raise exception 'GM hosted-game list is incorrect.'; end if;
  if current_setting('dcc_test.game_one') = current_setting('dcc_test.game_two') then raise exception 'Games must have separate IDs.'; end if;
  if (public.dcc_host_settings(current_setting('dcc_test.game_two')::uuid)->>'code') = current_setting('dcc_test.code_one') then raise exception 'Game Codes must be unique.'; end if;
  if exists (select 1 from public.dcc_campaigns where gm_user_id <> auth.uid()) then raise exception 'Host assignment was not the active account.'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', true);
do $$ declare v_joined uuid; v_before uuid; begin
  if (select count(*) from public.dcc_campaigns) <> 0 then raise exception 'Unjoined games leaked.'; end if;
  v_joined := public.dcc_join_game(lower(current_setting('dcc_test.code_one')));
  if v_joined is distinct from current_setting('dcc_test.game_one')::uuid then raise exception 'Valid code did not join the intended game.'; end if;
  if (select count(*) from public.dcc_campaigns) <> 1 then raise exception 'Joined-game list is incorrect.'; end if;
  if exists (select 1 from public.dcc_campaigns where id = current_setting('dcc_test.game_two')::uuid) then raise exception 'Joining one game exposed another.'; end if;
  perform public.dcc_create_crawler(v_joined, auth.uid(), 'Alice crawler', 10, 10, 7);
  select version into v_before from public.dcc_crawlers where campaign_id = v_joined;
  perform public.dcc_join_game(current_setting('dcc_test.code_one'));
  if (select count(*) from public.dcc_campaign_members where campaign_id = v_joined) <> 1 then raise exception 'Duplicate join created duplicate membership.'; end if;
  if not exists (select 1 from public.dcc_crawlers where campaign_id = v_joined and current_segments = 7 and version = v_before) then raise exception 'Rejoining reset crawler data.'; end if;
  begin
    perform public.dcc_host_settings(v_joined);
    raise exception 'Player read GM-only join settings.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.dcc_set_joining(v_joined, false);
    raise exception 'Player changed joining permissions.';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A player in one game may host another without becoming GM everywhere.
select set_config('dcc_test.alice_game', public.dcc_host_game('Alice hosted game')::text, true);
do $$ declare v_id uuid; v_version uuid; begin
  if (select count(*) from public.dcc_campaigns) <> 2 then raise exception 'Mixed host/player lobby lists are incorrect.'; end if;
  select id, version into v_id, v_version from public.dcc_crawlers where campaign_id = current_setting('dcc_test.game_one')::uuid;
  begin
    perform public.dcc_update_stats(v_id, v_version, 20, 14);
    raise exception 'Hosting another game granted global GM privileges.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.dcc_create_crawler(current_setting('dcc_test.game_two')::uuid, auth.uid(), 'Cross-game crawler', 10, 10);
    raise exception 'Player created in an unjoined game.';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'b1111111-1111-1111-1111-111111111111', true);
select public.dcc_set_joining(current_setting('dcc_test.game_one')::uuid, false);
select set_config('request.jwt.claim.sub', 'b3333333-3333-3333-3333-333333333333', true);
do $$ begin
  if public.dcc_join_game(current_setting('dcc_test.code_one')) is not null then raise exception 'Paused game accepted a new member.'; end if;
  if (select count(*) from public.dcc_campaigns) <> 0 then raise exception 'Failed joining granted read access.'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'b2222222-2222-2222-2222-222222222222', true);
do $$ begin
  if not exists (select 1 from public.dcc_crawlers where name = 'Alice crawler' and current_segments = 7) then raise exception 'Pausing new joins revoked existing sheet access.'; end if;
end $$;
select set_config('request.jwt.claim.sub', 'b1111111-1111-1111-1111-111111111111', true);
select public.dcc_set_joining(current_setting('dcc_test.game_one')::uuid, true);

select set_config('request.jwt.claim.sub', 'b3333333-3333-3333-3333-333333333333', true);
do $$ declare i integer; begin
  for i in 1..21 loop
    if public.dcc_join_game('00000000000000000000000000000000') is not null then raise exception 'Invalid code was accepted.'; end if;
  end loop;
  if public.dcc_join_game(current_setting('dcc_test.code_one')) is not null then raise exception 'Attempt limit did not apply.'; end if;
end $$;
reset role;
update dcc_private.join_attempts set window_started_at = clock_timestamp() - interval '2 minutes'
where user_id = 'b3333333-3333-3333-3333-333333333333';
set local role authenticated;
do $$ declare v_joined uuid; begin
  v_joined := public.dcc_join_game(current_setting('dcc_test.code_one'));
  if v_joined is distinct from current_setting('dcc_test.game_one')::uuid then raise exception 'Joining did not recover after cooldown.'; end if;
  perform public.dcc_create_crawler(v_joined, auth.uid(), 'Bob crawler', 10, 10);
  if exists (select 1 from public.dcc_crawlers where name = 'Alice crawler') then raise exception 'Player could read another crawler.'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'b1111111-1111-1111-1111-111111111111', true);
do $$ declare v_id uuid; v_version uuid; begin
  if (select count(*) from public.dcc_crawlers where campaign_id = current_setting('dcc_test.game_one')::uuid) <> 2 then raise exception 'GM did not see both players.'; end if;
  select id, version into v_id, v_version from public.dcc_crawlers where name = 'Alice crawler';
  perform public.dcc_update_stats(v_id, v_version, 10, 14);
  begin
    perform public.dcc_change_health(v_id, v_version, -1);
    raise exception 'A stale version was accepted.';
  exception when serialization_failure then null;
  end;
  if (select current_segments from public.dcc_crawlers where id = v_id) <> 7 then raise exception 'Stat edit healed or stale write changed health.'; end if;
  select version into v_version from public.dcc_crawlers where id = v_id;
  perform public.dcc_update_stats(v_id, v_version, 5, 10);
  if (select current_segments from public.dcc_crawlers where id = v_id) <> 5 then raise exception 'Health did not clamp to the new maximum.'; end if;
  select version into v_version from public.dcc_crawlers where id = v_id;
  perform public.dcc_change_health(v_id, v_version, -100);
  select version into v_version from public.dcc_crawlers where id = v_id;
  perform public.dcc_update_stats(v_id, v_version, 20, 14);
  if (select current_segments from public.dcc_crawlers where id = v_id) <> 0 then raise exception 'Stat edit revived a zero-health crawler.'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'b4444444-4444-4444-4444-444444444444', true);
do $$ begin
  begin
    perform public.dcc_host_game('Unconfirmed host');
    raise exception 'Unconfirmed account hosted a game.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.dcc_join_game(current_setting('dcc_test.code_one'));
    raise exception 'Unconfirmed account joined a game.';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;
select 'PASS: lobby database assertions completed; fixtures rolled back.' as result;
