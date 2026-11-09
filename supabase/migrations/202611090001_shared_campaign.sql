-- Apply once through the Supabase SQL Editor or your migration runner.
-- No account receives the GM role automatically. Bootstrap separately.
begin;

create schema if not exists dcc_private;
revoke all on schema dcc_private from public, anon, authenticated;
grant usage on schema dcc_private to authenticated;

create table public.dcc_campaigns (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  name text not null check (length(btrim(name)) between 1 and 200),
  gm_user_id uuid not null references auth.users(id) on delete restrict
);

create table public.dcc_campaign_members (
  campaign_id uuid not null references public.dcc_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  primary key (campaign_id, user_id)
);
create index dcc_members_user_idx on public.dcc_campaign_members(user_id);

create table public.dcc_crawlers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.dcc_campaigns(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 200),
  base_segments integer not null check (base_segments between 1 and 10000),
  constitution integer not null check (constitution between 0 and 10000),
  max_segments integer generated always as (
    greatest(1, base_segments + floor((constitution - 10)::numeric / 2)::integer)
  ) stored,
  current_segments integer not null check (current_segments >= 0 and current_segments <= max_segments),
  version uuid not null default gen_random_uuid(),
  unique (campaign_id, owner_user_id)
);
create index dcc_crawlers_owner_idx on public.dcc_crawlers(owner_user_id);

create function dcc_private.is_gm(p_campaign_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.dcc_campaigns
    where id = p_campaign_id and gm_user_id = (select auth.uid()));
$$;

create function dcc_private.is_member(p_campaign_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select dcc_private.is_gm(p_campaign_id) or exists (
    select 1 from public.dcc_campaign_members
    where campaign_id = p_campaign_id and user_id = (select auth.uid())
  );
$$;

alter table public.dcc_campaigns enable row level security;
alter table public.dcc_campaign_members enable row level security;
alter table public.dcc_crawlers enable row level security;

revoke all on public.dcc_campaigns, public.dcc_campaign_members, public.dcc_crawlers from public, anon, authenticated;
grant select on public.dcc_campaigns, public.dcc_campaign_members, public.dcc_crawlers to authenticated;

create policy dcc_campaign_read on public.dcc_campaigns for select to authenticated
using (dcc_private.is_member(id));

create policy dcc_members_read on public.dcc_campaign_members for select to authenticated
using (user_id = (select auth.uid()) or dcc_private.is_gm(campaign_id));

create policy dcc_crawler_read on public.dcc_crawlers for select to authenticated
using (dcc_private.is_gm(campaign_id) or (
  owner_user_id = (select auth.uid()) and dcc_private.is_member(campaign_id)
));

-- Definer implementations live outside the exposed schema, with explicit
-- identity checks. Public RPC wrappers below are security invoker.
create function dcc_private.add_player(p_campaign_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not dcc_private.is_gm(p_campaign_id) then
    raise exception 'Only the GM can add members.' using errcode = '42501';
  end if;
  if p_user_id is null or exists (select 1 from public.dcc_campaigns
      where id = p_campaign_id and gm_user_id = p_user_id)
     or not exists (select 1 from auth.users where id = p_user_id and email_confirmed_at is not null) then
    raise exception 'Use a confirmed player account ID.' using errcode = '22023';
  end if;
  insert into public.dcc_campaign_members(campaign_id, user_id) values (p_campaign_id, p_user_id);
end;
$$;

create function dcc_private.create_crawler(
  p_campaign_id uuid, p_owner_user_id uuid, p_name text,
  p_base_segments integer, p_constitution integer, p_current_segments integer default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_max integer;
begin
  if not dcc_private.is_member(p_campaign_id) or
     (p_owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(p_campaign_id)) then
    raise exception 'Crawler creation is not permitted.' using errcode = '42501';
  end if;
  if p_owner_user_id is null or not exists (
    select 1 from public.dcc_campaigns where id = p_campaign_id and gm_user_id = p_owner_user_id
    union all
    select 1 from public.dcc_campaign_members where campaign_id = p_campaign_id and user_id = p_owner_user_id
  ) then
    raise exception 'Owner must belong to the campaign.' using errcode = '22023';
  end if;
  if p_base_segments is null or p_base_segments not between 1 and 10000 or
     p_constitution is null or p_constitution not between 0 and 10000 then
    raise exception 'Invalid crawler stats.' using errcode = '22023';
  end if;
  v_max := greatest(1, p_base_segments + floor((p_constitution - 10)::numeric / 2)::integer);
  insert into public.dcc_crawlers(campaign_id, owner_user_id, name, base_segments, constitution, current_segments)
  values (p_campaign_id, p_owner_user_id, btrim(p_name), p_base_segments, p_constitution, coalesce(p_current_segments, v_max));
end;
$$;

create function dcc_private.change_health(p_crawler_id uuid, p_expected_version uuid, p_adjustment bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.dcc_crawlers%rowtype;
begin
  select * into v_row from public.dcc_crawlers where id = p_crawler_id for update;
  if not found or not dcc_private.is_member(v_row.campaign_id) or
    (v_row.owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(v_row.campaign_id)) then
    raise exception 'Crawler access is not permitted.' using errcode = '42501';
  end if;
  if p_expected_version is distinct from v_row.version then
    raise exception 'Crawler changed. Refresh before trying again.' using errcode = '40001';
  end if;
  if p_adjustment is null or p_adjustment not between -9007199254740991 and 9007199254740991 then
    raise exception 'Invalid health adjustment.' using errcode = '22023';
  end if;
  update public.dcc_crawlers set
    current_segments = least(v_row.max_segments::bigint, greatest(0::bigint, v_row.current_segments::bigint + p_adjustment))::integer,
    version = gen_random_uuid()
  where id = p_crawler_id;
end;
$$;

create function dcc_private.update_stats(
  p_crawler_id uuid, p_expected_version uuid, p_base_segments integer, p_constitution integer
) returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.dcc_crawlers%rowtype; v_max integer;
begin
  select * into v_row from public.dcc_crawlers where id = p_crawler_id for update;
  if not found or not dcc_private.is_gm(v_row.campaign_id) then
    raise exception 'Only the GM can edit existing stats.' using errcode = '42501';
  end if;
  if p_expected_version is distinct from v_row.version then
    raise exception 'Crawler changed. Refresh before trying again.' using errcode = '40001';
  end if;
  if p_base_segments is null or p_base_segments not between 1 and 10000 or
     p_constitution is null or p_constitution not between 0 and 10000 then
    raise exception 'Invalid crawler stats.' using errcode = '22023';
  end if;
  v_max := greatest(1, p_base_segments + floor((p_constitution - 10)::numeric / 2)::integer);
  update public.dcc_crawlers set base_segments = p_base_segments, constitution = p_constitution,
    current_segments = least(v_row.current_segments, v_max), version = gen_random_uuid()
  where id = p_crawler_id;
end;
$$;

create function public.dcc_add_player(p_campaign_id uuid, p_user_id uuid) returns void
language sql security invoker set search_path = '' as $$
  select dcc_private.add_player(p_campaign_id, p_user_id);
$$;
create function public.dcc_create_crawler(p_campaign_id uuid, p_owner_user_id uuid, p_name text,
  p_base_segments integer, p_constitution integer, p_current_segments integer default null) returns void
language sql security invoker set search_path = '' as $$
  select dcc_private.create_crawler(p_campaign_id, p_owner_user_id, p_name, p_base_segments, p_constitution, p_current_segments);
$$;
create function public.dcc_change_health(p_crawler_id uuid, p_expected_version uuid, p_adjustment bigint) returns void
language sql security invoker set search_path = '' as $$
  select dcc_private.change_health(p_crawler_id, p_expected_version, p_adjustment);
$$;
create function public.dcc_update_stats(p_crawler_id uuid, p_expected_version uuid, p_base_segments integer, p_constitution integer) returns void
language sql security invoker set search_path = '' as $$
  select dcc_private.update_stats(p_crawler_id, p_expected_version, p_base_segments, p_constitution);
$$;

revoke all on all functions in schema dcc_private from public, anon, authenticated;
grant execute on all functions in schema dcc_private to authenticated;
revoke all on function public.dcc_add_player(uuid, uuid) from public, anon, authenticated;
revoke all on function public.dcc_create_crawler(uuid, uuid, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.dcc_change_health(uuid, uuid, bigint) from public, anon, authenticated;
revoke all on function public.dcc_update_stats(uuid, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.dcc_add_player(uuid, uuid) to authenticated;
grant execute on function public.dcc_create_crawler(uuid, uuid, text, integer, integer, integer) to authenticated;
grant execute on function public.dcc_change_health(uuid, uuid, bigint) to authenticated;
grant execute on function public.dcc_update_stats(uuid, uuid, integer, integer) to authenticated;

notify pgrst, 'reload schema';
commit;
