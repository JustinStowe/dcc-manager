begin;

alter table public.dcc_encounters
  add column mode text not null default 'mob' check (mode in ('mob','pvp')),
  add column phase text default 'mob-declaration';
-- Earlier encounters used an initiative order for ordinary Mob combat. The
-- official flow has phases instead; keep the roster and round, but reset order.
update public.dcc_encounters e set
  participants = coalesce((select jsonb_agg(value || '{"initiative":null}'::jsonb)
    from jsonb_array_elements(e.participants)), '[]'::jsonb),
  current_participant_id = null, version = gen_random_uuid();
alter table public.dcc_encounters add constraint dcc_encounter_flow_check check (
  (mode = 'mob' and phase in ('mob-declaration','crawler-reaction','mob-resolution','crawler-action','cleanup') and current_participant_id is null)
  or (mode = 'pvp' and phase is null)
);

drop function public.dcc_encounter_action(uuid,uuid,text,uuid,text,integer);
create function public.dcc_encounter_action(
  p_campaign_id uuid, p_expected_version uuid, p_operation text,
  p_participant_id uuid default null, p_name text default null,
  p_initiative integer default null, p_mode text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  state public.dcc_encounters%rowtype;
  crawler public.dcc_crawlers%rowtype;
  entry jsonb;
  updated jsonb;
  next_id uuid;
  current_score integer;
  wrapped boolean := false;
begin
  if auth.uid() is null or p_campaign_id is null or not dcc_private.is_gm(p_campaign_id) then
    raise exception 'Only the campaign GM manages encounters.' using errcode = '42501';
  end if;
  if p_operation is null or p_operation not in ('start','add-crawler','add-monster','initiative','remove','next','end') then
    raise exception 'Invalid encounter action.' using errcode = '22023';
  end if;
  perform 1 from public.dcc_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Game unavailable.' using errcode = '42501'; end if;
  select * into state from public.dcc_encounters where campaign_id = p_campaign_id for update;
  if p_operation = 'start' then
    if p_mode is null or p_mode not in ('mob','pvp') then raise exception 'Choose a combat mode.' using errcode = '22023'; end if;
    if found then
      if state.active then raise exception 'End the current encounter first.' using errcode = '22023'; end if;
      if state.version is distinct from p_expected_version then raise exception 'Encounter changed.' using errcode = '40001'; end if;
      update public.dcc_encounters set id = gen_random_uuid(), version = gen_random_uuid(), active = true,
        mode = p_mode, phase = case when p_mode = 'mob' then 'mob-declaration' else null end,
        round = 1, current_participant_id = null, participants = '[]'::jsonb where campaign_id = p_campaign_id;
    else
      if p_expected_version is not null then raise exception 'Encounter changed.' using errcode = '40001'; end if;
      insert into public.dcc_encounters(campaign_id,mode,phase)
        values (p_campaign_id,p_mode,case when p_mode = 'mob' then 'mob-declaration' else null end);
    end if;
    return;
  end if;
  if not found or not state.active then raise exception 'Start an encounter first.' using errcode = '22023'; end if;
  if state.version is distinct from p_expected_version then raise exception 'Encounter changed.' using errcode = '40001'; end if;
  updated := state.participants;

  if p_operation in ('add-crawler','add-monster') then
    if jsonb_array_length(updated) >= 50 then raise exception 'Encounter is full.' using errcode = '22023'; end if;
    if p_operation = 'add-crawler' then
      select * into crawler from public.dcc_crawlers where id = p_participant_id and campaign_id = p_campaign_id;
      if not found or crawler.ruleset <> 'tutorial-v1' then raise exception 'Choose an official crawler in this game.' using errcode = '22023'; end if;
      if exists (select 1 from jsonb_array_elements(updated) e where e->>'id' = p_participant_id::text) then
        raise exception 'Crawler is already in this encounter.' using errcode = '22023';
      end if;
      updated := updated || jsonb_build_array(jsonb_build_object('id',p_participant_id::text,'kind','crawler','name',crawler.name,'initiative',null));
    else
      if state.mode <> 'mob' then raise exception 'PvP contains crawlers only.' using errcode = '22023'; end if;
      if p_name is null or length(btrim(p_name)) not between 1 and 100 then raise exception 'Enter a monster name of 1 to 100 characters.' using errcode = '22023'; end if;
      updated := updated || jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'kind','monster','name',btrim(p_name),'initiative',null));
    end if;
  elsif p_operation in ('initiative','remove') then
    if p_participant_id is null or not exists (select 1 from jsonb_array_elements(updated) e where e->>'id' = p_participant_id::text) then
      raise exception 'Participant unavailable.' using errcode = '22023';
    end if;
    if p_operation = 'initiative' then
      if state.mode <> 'pvp' or p_initiative is null or p_initiative not between 1 and 10020 then
        raise exception 'Enter a PvP d20 + Dex total from 1 to 10020.' using errcode = '22023';
      end if;
    end if;
    updated := '[]'::jsonb;
    for entry in select value from jsonb_array_elements(state.participants) loop
      if entry->>'id' = p_participant_id::text then
        if p_operation = 'remove' then continue; end if;
        entry := jsonb_set(entry,'{initiative}',to_jsonb(p_initiative));
      end if;
      updated := updated || jsonb_build_array(entry);
    end loop;
  elsif p_operation = 'next' then
    if jsonb_array_length(updated) = 0 then raise exception 'Add a participant first.' using errcode = '22023'; end if;
    if state.mode = 'mob' then
      case state.phase
        when 'mob-declaration' then update public.dcc_encounters set phase = 'crawler-reaction', version = gen_random_uuid() where campaign_id = p_campaign_id;
        when 'crawler-reaction' then update public.dcc_encounters set phase = 'mob-resolution', version = gen_random_uuid() where campaign_id = p_campaign_id;
        when 'mob-resolution' then update public.dcc_encounters set phase = 'crawler-action', version = gen_random_uuid() where campaign_id = p_campaign_id;
        when 'crawler-action' then update public.dcc_encounters set phase = 'cleanup', version = gen_random_uuid() where campaign_id = p_campaign_id;
        when 'cleanup' then
          if state.round >= 100000 then raise exception 'Encounter round limit reached.' using errcode = '22023'; end if;
          update public.dcc_encounters set phase = 'mob-declaration', round = state.round + 1,
            version = gen_random_uuid() where campaign_id = p_campaign_id;
          wrapped := true;
        else raise exception 'Encounter phase unavailable.' using errcode = '22023';
      end case;
    else
      if exists (select 1 from jsonb_array_elements(updated) e where e->'initiative' = 'null'::jsonb) then
        raise exception 'Record fresh initiative for every crawler.' using errcode = '22023';
      end if;
      if state.current_participant_id is null then
        update public.dcc_encounters set current_participant_id = (updated->0->>'id')::uuid,
          version = gen_random_uuid() where campaign_id = p_campaign_id;
        return;
      end if;
      select (value->>'initiative')::integer into current_score from jsonb_array_elements(updated)
        where value->>'id' = state.current_participant_id::text;
      if current_score is null then raise exception 'Encounter turn is out of sync.' using errcode = '22023'; end if;
      select (value->>'id')::uuid into next_id from jsonb_array_elements(updated)
        where (value->>'initiative')::integer < current_score
        order by (value->>'initiative')::integer desc, value->>'id' limit 1;
      if next_id is null then
        if state.round >= 100000 then raise exception 'Encounter round limit reached.' using errcode = '22023'; end if;
        updated := coalesce((select jsonb_agg(value || '{"initiative":null}'::jsonb)
          from jsonb_array_elements(updated)), '[]'::jsonb);
        update public.dcc_encounters set round = state.round + 1, current_participant_id = null,
          participants = updated, version = gen_random_uuid() where campaign_id = p_campaign_id;
        wrapped := true;
      else
        update public.dcc_encounters set current_participant_id = next_id, version = gen_random_uuid()
          where campaign_id = p_campaign_id;
      end if;
    end if;
    if wrapped then
      -- Finish Clean up / the PvP round atomically with each crawler countdown.
      for entry in select value from jsonb_array_elements(updated) where value->>'kind' = 'crawler' loop
        select * into crawler from public.dcc_crawlers where id = (entry->>'id')::uuid and campaign_id = p_campaign_id for update;
        if not found then raise exception 'Encounter crawler unavailable.' using errcode = '22023'; end if;
        if exists (select 1 from jsonb_array_elements(crawler.tracked_effects) effect
          where effect->>'active' = 'true' and effect->'remainingRounds' <> 'null'::jsonb) then
          perform public.dcc_effect_action(crawler.id,crawler.version,'tick','{}'::jsonb);
        end if;
      end loop;
    end if;
    return;
  elsif p_operation = 'end' then
    update public.dcc_encounters set active = false, version = gen_random_uuid() where campaign_id = p_campaign_id;
    return;
  end if;

  if state.mode = 'pvp' then
    select coalesce(jsonb_agg(value order by coalesce((value->>'initiative')::integer,-1) desc, value->>'id'), '[]'::jsonb)
      into updated from jsonb_array_elements(updated);
  end if;
  if state.mode = 'pvp' and state.current_participant_id is not null and
    not exists (select 1 from jsonb_array_elements(updated) e where e->>'id' = state.current_participant_id::text) then
    next_id := null;
  else
    next_id := state.current_participant_id;
  end if;
  update public.dcc_encounters set participants = updated, current_participant_id = next_id,
    version = gen_random_uuid() where campaign_id = p_campaign_id;
end $$;
revoke all on function public.dcc_encounter_action(uuid,uuid,text,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.dcc_encounter_action(uuid,uuid,text,uuid,text,integer,text) to authenticated;
notify pgrst, 'reload schema';
commit;
