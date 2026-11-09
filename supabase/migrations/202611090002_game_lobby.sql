-- Apply after 202611090001_shared_campaign.sql. Existing campaigns/crawlers
-- remain intact; hosting and joining replace administrator provisioning.
begin;

alter table public.dcc_campaigns drop column singleton;
alter table public.dcc_campaigns add column accepting_players boolean not null default true;

create table dcc_private.game_codes (
  campaign_id uuid primary key references public.dcc_campaigns(id) on delete cascade,
  code text not null unique check (code ~ '^[0-9A-F]{32}$')
);
create table dcc_private.join_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0)
);
revoke all on dcc_private.game_codes, dcc_private.join_attempts from public, anon, authenticated;

-- Give previously provisioned games codes too; no game state is replaced.
insert into dcc_private.game_codes(campaign_id, code)
select id, upper(replace(gen_random_uuid()::text, '-', '')) from public.dcc_campaigns;

create function dcc_private.host_game(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users where id = v_actor and email_confirmed_at is not null) then
    raise exception 'Confirm your email first.' using errcode = '42501';
  end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 200 then
    raise exception 'Enter a game name between 1 and 200 characters.' using errcode = '22023';
  end if;
  insert into public.dcc_campaigns(name, gm_user_id) values (btrim(p_name), v_actor) returning id into v_id;
  insert into dcc_private.game_codes(campaign_id, code)
    values (v_id, upper(replace(gen_random_uuid()::text, '-', '')));
  return v_id;
end;
$$;

create function dcc_private.join_game(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid(); v_campaign public.dcc_campaigns%rowtype;
  v_attempts integer; v_code text;
begin
  if v_actor is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users where id = v_actor and email_confirmed_at is not null) then
    raise exception 'Confirm your email first.' using errcode = '42501';
  end if;
  -- Failure returns NULL instead of raising, so the attempt count commits.
  -- Per-account row locking serializes simultaneous guesses.
  insert into dcc_private.join_attempts(user_id, window_started_at, attempts)
  values (v_actor, clock_timestamp(), 1)
  on conflict (user_id) do update set
    attempts = case when dcc_private.join_attempts.window_started_at < clock_timestamp() - interval '1 minute'
      then 1 else dcc_private.join_attempts.attempts + 1 end,
    window_started_at = case when dcc_private.join_attempts.window_started_at < clock_timestamp() - interval '1 minute'
      then clock_timestamp() else dcc_private.join_attempts.window_started_at end
  returning attempts into v_attempts;
  if v_attempts > 20 then return null; end if;
  v_code := upper(regexp_replace(coalesce(p_code, ''), '[[:space:]-]', '', 'g'));
  if v_code !~ '^[0-9A-F]{32}$' then return null; end if;
  select c.* into v_campaign from public.dcc_campaigns c
    join dcc_private.game_codes gc on gc.campaign_id = c.id
    where gc.code = v_code for update of c;
  if not found or not v_campaign.accepting_players then return null; end if;
  if v_campaign.gm_user_id = v_actor then return v_campaign.id; end if;
  insert into public.dcc_campaign_members(campaign_id, user_id)
    values (v_campaign.id, v_actor) on conflict do nothing;
  return v_campaign.id;
end;
$$;

create function dcc_private.host_settings(p_campaign_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if not dcc_private.is_gm(p_campaign_id) then
    raise exception 'Only this game GM can read its join code.' using errcode = '42501';
  end if;
  select jsonb_build_object('code', gc.code, 'acceptingPlayers', c.accepting_players)
    into v_result from public.dcc_campaigns c
    join dcc_private.game_codes gc on gc.campaign_id = c.id where c.id = p_campaign_id;
  return v_result;
end;
$$;

create function dcc_private.set_joining(p_campaign_id uuid, p_accepting boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not dcc_private.is_gm(p_campaign_id) then
    raise exception 'Only this game GM can change joining.' using errcode = '42501';
  end if;
  if p_accepting is null then raise exception 'Choose a joining state.' using errcode = '22023'; end if;
  update public.dcc_campaigns set accepting_players = p_accepting where id = p_campaign_id;
end;
$$;

create function public.dcc_host_game(p_name text) returns uuid
language sql security invoker set search_path = '' as $$ select dcc_private.host_game(p_name); $$;
create function public.dcc_join_game(p_code text) returns uuid
language sql security invoker set search_path = '' as $$ select dcc_private.join_game(p_code); $$;
create function public.dcc_host_settings(p_campaign_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$ select dcc_private.host_settings(p_campaign_id); $$;
create function public.dcc_set_joining(p_campaign_id uuid, p_accepting boolean) returns void
language sql security invoker set search_path = '' as $$ select dcc_private.set_joining(p_campaign_id, p_accepting); $$;

revoke all on function dcc_private.host_game(text) from public, anon, authenticated;
revoke all on function dcc_private.join_game(text) from public, anon, authenticated;
revoke all on function dcc_private.host_settings(uuid) from public, anon, authenticated;
revoke all on function dcc_private.set_joining(uuid, boolean) from public, anon, authenticated;
revoke all on function public.dcc_host_game(text) from public, anon, authenticated;
revoke all on function public.dcc_join_game(text) from public, anon, authenticated;
revoke all on function public.dcc_host_settings(uuid) from public, anon, authenticated;
revoke all on function public.dcc_set_joining(uuid, boolean) from public, anon, authenticated;
grant execute on function dcc_private.host_game(text), dcc_private.join_game(text),
  dcc_private.host_settings(uuid), dcc_private.set_joining(uuid, boolean) to authenticated;
grant execute on function public.dcc_host_game(text), public.dcc_join_game(text),
  public.dcc_host_settings(uuid), public.dcc_set_joining(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
