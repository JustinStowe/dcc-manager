begin;

create table public.dcc_encounters (
  id uuid not null default gen_random_uuid() unique,
  campaign_id uuid primary key references public.dcc_campaigns(id) on delete cascade,
  version uuid not null default gen_random_uuid(),
  active boolean not null default true,
  round integer not null default 1 check (round between 1 and 100000),
  current_participant_id uuid,
  participants jsonb not null default '[]'::jsonb check (jsonb_typeof(participants) = 'array' and jsonb_array_length(participants) <= 50)
);
alter table public.dcc_encounters enable row level security;
revoke all on public.dcc_encounters from public, anon, authenticated;
grant select on public.dcc_encounters to authenticated;
create policy dcc_encounter_gm_read on public.dcc_encounters for select to authenticated
  using (dcc_private.is_gm(campaign_id));

create function public.dcc_encounter_action(
  p_campaign_id uuid, p_expected_version uuid, p_operation text,
  p_participant_id uuid default null, p_name text default null, p_initiative integer default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  state public.dcc_encounters%rowtype;
  crawler public.dcc_crawlers%rowtype;
  entry jsonb;
  updated jsonb := '[]'::jsonb;
  new_id uuid;
  found_entry boolean := false;
  current_index integer;
  total integer;
  next_id uuid;
  next_round integer;
begin
  if auth.uid() is null or p_campaign_id is null or not dcc_private.is_gm(p_campaign_id) then
    raise exception 'Only the campaign GM manages encounters.' using errcode = '42501';
  end if;
  if p_operation not in ('start','add-crawler','add-monster','initiative','remove','next','end') or p_operation is null then
    raise exception 'Invalid encounter action.' using errcode = '22023';
  end if;
  -- Serialize the first start with other starts, including before an encounter row exists.
  perform 1 from public.dcc_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Game unavailable.' using errcode = '42501'; end if;
  select * into state from public.dcc_encounters where campaign_id = p_campaign_id for update;
  if p_operation = 'start' then
    if found then
      if state.active then raise exception 'End the current encounter first.' using errcode = '22023'; end if;
      if state.version is distinct from p_expected_version then raise exception 'Encounter changed.' using errcode = '40001'; end if;
      update public.dcc_encounters set id = gen_random_uuid(), version = gen_random_uuid(), active = true,
        round = 1, current_participant_id = null, participants = '[]'::jsonb where campaign_id = p_campaign_id;
    else
      if p_expected_version is not null then raise exception 'Encounter changed.' using errcode = '40001'; end if;
      insert into public.dcc_encounters(campaign_id) values (p_campaign_id);
    end if;
    return;
  end if;
  if not found or not state.active then raise exception 'Start an encounter first.' using errcode = '22023'; end if;
  if state.version is distinct from p_expected_version then raise exception 'Encounter changed.' using errcode = '40001'; end if;
  updated := state.participants;

  if p_operation in ('add-crawler','add-monster','initiative') and (p_initiative is null or p_initiative not between -1000 and 1000) then
    raise exception 'Initiative must be between -1000 and 1000.' using errcode = '22023';
  end if;
  if p_operation in ('add-crawler','add-monster') then
    if jsonb_array_length(updated) >= 50 then raise exception 'Encounter is full.' using errcode = '22023'; end if;
    if p_operation = 'add-crawler' then
      select * into crawler from public.dcc_crawlers where id = p_participant_id and campaign_id = p_campaign_id;
      if not found or crawler.ruleset <> 'tutorial-v1' then raise exception 'Choose an official crawler in this game.' using errcode = '22023'; end if;
      if exists (select 1 from jsonb_array_elements(updated) e where e->>'id' = p_participant_id::text) then
        raise exception 'Crawler is already in this encounter.' using errcode = '22023';
      end if;
      new_id := p_participant_id;
      updated := updated || jsonb_build_array(jsonb_build_object('id', new_id::text, 'kind', 'crawler', 'name', crawler.name, 'initiative', p_initiative));
    else
      if p_name is null or length(btrim(p_name)) not between 1 and 100 then raise exception 'Enter a monster name of 1 to 100 characters.' using errcode = '22023'; end if;
      new_id := gen_random_uuid();
      updated := updated || jsonb_build_array(jsonb_build_object('id', new_id::text, 'kind', 'monster', 'name', btrim(p_name), 'initiative', p_initiative));
    end if;
  elsif p_operation in ('initiative','remove') then
    if p_participant_id is null then raise exception 'Choose a participant.' using errcode = '22023'; end if;
    updated := '[]'::jsonb;
    for entry in select value from jsonb_array_elements(state.participants) loop
      if entry->>'id' = p_participant_id::text then
        found_entry := true;
        if p_operation = 'remove' then continue; end if;
        entry := jsonb_set(entry, '{initiative}', to_jsonb(p_initiative));
      end if;
      updated := updated || jsonb_build_array(entry);
    end loop;
    if not found_entry then raise exception 'Participant unavailable.' using errcode = '22023'; end if;
  elsif p_operation = 'next' then
    total := jsonb_array_length(updated);
    if total = 0 then raise exception 'Add a participant first.' using errcode = '22023'; end if;
    if state.current_participant_id is null then
      update public.dcc_encounters set current_participant_id = (updated->0->>'id')::uuid,
        version = gen_random_uuid() where campaign_id = p_campaign_id;
      return;
    end if;
    select ordinality::integer into current_index from jsonb_array_elements(updated) with ordinality e(value, ordinality)
      where value->>'id' = state.current_participant_id::text;
    if current_index is null then raise exception 'Encounter turn is out of sync.' using errcode = '22023'; end if;
    next_round := state.round + case when current_index = total then 1 else 0 end;
    if next_round > 100000 then raise exception 'Encounter round limit reached.' using errcode = '22023'; end if;
    next_id := (updated->(current_index % total)->>'id')::uuid;
    update public.dcc_encounters set round = next_round, current_participant_id = next_id, version = gen_random_uuid()
      where campaign_id = p_campaign_id;
    if current_index = total then
      -- Every participating crawler advances exactly once. A failure rolls back the turn too.
      for entry in select value from jsonb_array_elements(updated) where value->>'kind' = 'crawler' loop
        select * into crawler from public.dcc_crawlers where id = (entry->>'id')::uuid and campaign_id = p_campaign_id for update;
        if not found then raise exception 'Encounter crawler unavailable.' using errcode = '22023'; end if;
        if exists (select 1 from jsonb_array_elements(crawler.tracked_effects) effect
          where effect->>'active' = 'true' and effect->'remainingRounds' <> 'null'::jsonb) then
          perform public.dcc_effect_action(crawler.id, crawler.version, 'tick', '{}'::jsonb);
        end if;
      end loop;
    end if;
    return;
  elsif p_operation = 'end' then
    update public.dcc_encounters set active = false, version = gen_random_uuid() where campaign_id = p_campaign_id;
    return;
  end if;

  select coalesce(jsonb_agg(value order by (value->>'initiative')::integer desc, value->>'id'), '[]'::jsonb)
    into updated from jsonb_array_elements(updated);
  if jsonb_array_length(updated) = 0 or state.current_participant_id is null then
    next_id := null;
  elsif not exists (
    select 1 from jsonb_array_elements(updated) e where e->>'id' = state.current_participant_id::text
  ) then
    next_id := (updated->0->>'id')::uuid;
  else
    next_id := state.current_participant_id;
  end if;
  update public.dcc_encounters set participants = updated, current_participant_id = next_id,
    version = gen_random_uuid() where campaign_id = p_campaign_id;
end $$;

create function dcc_private.live_encounter_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare gm uuid;
begin
  select gm_user_id into gm from public.dcc_campaigns where id = new.campaign_id;
  perform dcc_private.live_notify(array[gm]);
  return null;
end $$;
create trigger dcc_live_encounter after insert or update on public.dcc_encounters
  for each row execute function dcc_private.live_encounter_change();
revoke all on function public.dcc_encounter_action(uuid,uuid,text,uuid,text,integer),
  dcc_private.live_encounter_change() from public, anon, authenticated;
grant execute on function public.dcc_encounter_action(uuid,uuid,text,uuid,text,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
