begin;

create function public.dcc_delete_game(p_campaign_id uuid, p_confirmation_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare game public.dcc_campaigns%rowtype;
begin
  select * into game from public.dcc_campaigns where id = p_campaign_id for update;
  if not found or auth.uid() is null or game.gm_user_id is distinct from auth.uid() then
    raise exception 'Only this game GM can delete it.' using errcode = '42501';
  end if;
  if p_confirmation_name is distinct from game.name then
    raise exception 'Type the exact game name to confirm deletion.' using errcode = '22023';
  end if;
  delete from dcc_private.tutorial_legacy_archive where crawler_id in
    (select id from public.dcc_crawlers where campaign_id = p_campaign_id);
  delete from dcc_private.tutorial_rolls where campaign_id = p_campaign_id;
  delete from public.dcc_campaigns where id = p_campaign_id;
end;
$$;
revoke all on function public.dcc_delete_game(uuid,text) from public, anon, authenticated;
grant execute on function public.dcc_delete_game(uuid,text) to authenticated;

create table public.dcc_crawler_profiles (
  id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  name text not null check (length(btrim(name)) between 1 and 200),
  profile jsonb not null,
  roll_id uuid,
  version uuid not null default gen_random_uuid(),
  primary key (owner_user_id, slot)
);
alter table public.dcc_crawler_profiles enable row level security;
revoke all on public.dcc_crawler_profiles from public, anon, authenticated;
grant select on public.dcc_crawler_profiles to authenticated;
create policy dcc_profile_read on public.dcc_crawler_profiles for select to authenticated
  using (owner_user_id = (select auth.uid()));

create table dcc_private.profile_rolls (
  id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  stats jsonb not null,
  primary key (owner_user_id, slot)
);
revoke all on dcc_private.profile_rolls from public, anon, authenticated;

create function public.dcc_roll_profile(p_slot integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare saved dcc_private.profile_rolls%rowtype; scores jsonb := '{}'; stat_key text;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if p_slot is null or p_slot not between 1 and 3 then raise exception 'Choose slot 1, 2, or 3.' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exists(select 1 from public.dcc_crawler_profiles where owner_user_id = auth.uid() and slot = p_slot) then
    raise exception 'Edit the saved profile without changing its stat method.' using errcode = '22023';
  end if;
  foreach stat_key in array array['strength','intelligence','constitution','dexterity','charisma'] loop
    scores := scores || jsonb_build_object(stat_key, floor(random() * 5)::integer + 2);
  end loop;
  insert into dcc_private.profile_rolls(owner_user_id,slot,stats) values(auth.uid(),p_slot,scores)
    on conflict(owner_user_id,slot) do nothing;
  select * into saved from dcc_private.profile_rolls where owner_user_id = auth.uid() and slot = p_slot;
  return jsonb_build_object('id',saved.id,'scores',saved.stats);
end;
$$;

create function dcc_private.save_profile(p_slot integer, p_name text, p_profile jsonb, p_roll_id uuid, p_expected_version uuid, p_campaign_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare previous public.dcc_crawler_profiles%rowtype; saved_roll dcc_private.profile_rolls%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if p_slot is null or p_slot not between 1 and 3 then raise exception 'Choose slot 1, 2, or 3.' using errcode = '22023'; end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 200 then raise exception 'Enter a crawler name.' using errcode = '22023'; end if;
  if p_profile is null then raise exception 'Enter a crawler profile.' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select * into previous from public.dcc_crawler_profiles where owner_user_id = auth.uid() and slot = p_slot;
  if previous.version is distinct from p_expected_version then
    raise exception 'Profile slot changed. Refresh before saving.' using errcode = '40001';
  end if;
  perform dcc_private.validate_tutorial(p_profile, true);
  select * into saved_roll from dcc_private.profile_rolls where owner_user_id = auth.uid() and slot = p_slot;
  if found and (p_profile->>'method' is distinct from 'rolled' or p_roll_id is distinct from saved_roll.id or p_profile->'initialStats' is distinct from saved_roll.stats) then
    raise exception 'Recover the saved roll for this profile slot.' using errcode = '22023';
  end if;
  if previous.id is not null and (p_profile->>'method' is distinct from previous.profile->>'method' or p_profile->'initialStats' is distinct from previous.profile->'initialStats') then
    raise exception 'Saved starting stats cannot be changed. Use an empty slot for a new build.' using errcode = '22023';
  end if;
  if p_profile->>'method' = 'rolled' and ((
    (saved_roll.id = p_roll_id and saved_roll.stats = p_profile->'initialStats') or
    (previous.roll_id = p_roll_id and previous.profile->'initialStats' = p_profile->'initialStats') or
    exists(select 1 from dcc_private.tutorial_rolls where campaign_id = p_campaign_id and owner_user_id = auth.uid() and id = p_roll_id and stats = p_profile->'initialStats')
  ) is not true) then
    raise exception 'Roll or recover your stats on the server first.' using errcode = '22023';
  end if;
  insert into public.dcc_crawler_profiles(owner_user_id,slot,name,profile,roll_id)
    values(auth.uid(),p_slot,btrim(p_name),p_profile,p_roll_id)
    on conflict(owner_user_id,slot) do update set name=excluded.name,profile=excluded.profile,roll_id=excluded.roll_id,version=gen_random_uuid();
end;
$$;

create function public.dcc_save_profile(p_slot integer,p_name text,p_profile jsonb,p_roll_id uuid default null,p_expected_version uuid default null)
returns void language sql security invoker set search_path = '' as $$
  select dcc_private.save_profile(p_slot,p_name,p_profile,p_roll_id,p_expected_version);
$$;

create function public.dcc_delete_profile(p_slot integer,p_expected_version uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  delete from public.dcc_crawler_profiles where owner_user_id=auth.uid() and slot=p_slot and version=p_expected_version;
  if not found then raise exception 'Profile slot changed. Refresh before deleting.' using errcode = '40001'; end if;
  delete from dcc_private.profile_rolls where owner_user_id=auth.uid() and slot=p_slot;
end;
$$;

create function public.dcc_create_tutorial_and_save(p_campaign_id uuid,p_owner_user_id uuid,p_name text,p_profile jsonb,p_roll_id uuid default null,p_save_slot integer default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_owner_user_id is distinct from auth.uid() then raise exception 'Create only your own crawler.' using errcode = '42501'; end if;
  perform dcc_private.create_tutorial(p_campaign_id,p_owner_user_id,p_name,p_profile,p_roll_id);
  if p_save_slot is not null then perform dcc_private.save_profile(p_save_slot,p_name,p_profile,p_roll_id,null,p_campaign_id); end if;
end;
$$;

create function public.dcc_use_crawler_profile(p_campaign_id uuid,p_slot integer,p_expected_version uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare saved public.dcc_crawler_profiles%rowtype; saved_roll_id uuid;
begin
  if auth.uid() is null or not dcc_private.is_member(p_campaign_id) then raise exception 'Join this game first.' using errcode = '42501'; end if;
  select * into saved from public.dcc_crawler_profiles where owner_user_id=auth.uid() and slot=p_slot for share;
  if not found or saved.version is distinct from p_expected_version then raise exception 'Profile slot changed. Refresh before using it.' using errcode = '40001'; end if;
  if saved.profile->>'method' = 'rolled' then
    insert into dcc_private.tutorial_rolls(campaign_id,owner_user_id,stats)
      values(p_campaign_id,auth.uid(),saved.profile->'initialStats') on conflict(campaign_id,owner_user_id) do nothing;
    select id into saved_roll_id from dcc_private.tutorial_rolls where campaign_id=p_campaign_id and owner_user_id=auth.uid();
  end if;
  perform dcc_private.create_tutorial(p_campaign_id,auth.uid(),saved.name,saved.profile,saved_roll_id);
end;
$$;

revoke all on function dcc_private.save_profile(integer,text,jsonb,uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function dcc_private.save_profile(integer,text,jsonb,uuid,uuid,uuid) to authenticated;
revoke all on function public.dcc_roll_profile(integer), public.dcc_save_profile(integer,text,jsonb,uuid,uuid), public.dcc_delete_profile(integer,uuid), public.dcc_create_tutorial_and_save(uuid,uuid,text,jsonb,uuid,integer), public.dcc_use_crawler_profile(uuid,integer,uuid) from public, anon, authenticated;
grant execute on function public.dcc_roll_profile(integer), public.dcc_save_profile(integer,text,jsonb,uuid,uuid), public.dcc_delete_profile(integer,uuid), public.dcc_create_tutorial_and_save(uuid,uuid,text,jsonb,uuid,integer), public.dcc_use_crawler_profile(uuid,integer,uuid) to authenticated;

notify pgrst, 'reload schema';
commit;