begin;
-- GM saferoom status for one or more crawlers. An open saferoom (current floor only)
-- lets the owner open/claim boxes and, on Floor 3+, spend every pending level-up point.
-- No access rows, authorizations, stats or points are changed by applying this migration.
create function public.dcc_set_saferoom(p_campaign_id uuid,p_crawler_ids uuid[],p_allowed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare r record;gm uuid;users uuid[];pending integer;changed boolean;
begin
 if auth.uid() is null or p_campaign_id is null or not dcc_private.is_gm(p_campaign_id) then raise exception 'Only the GM changes saferoom status.' using errcode='42501';end if;
 if p_allowed is null or p_crawler_ids is null or cardinality(p_crawler_ids) not between 1 and 200 or array_position(p_crawler_ids,null) is not null then raise exception 'Choose one or more crawlers.' using errcode='22023';end if;
 if exists(select 1 from unnest(p_crawler_ids) requested(id) where not exists(select 1 from public.dcc_crawlers c where c.id=requested.id and c.campaign_id=p_campaign_id and c.ruleset='tutorial-v1')) then raise exception 'Crawler access denied.' using errcode='42501';end if;
 select gm_user_id into gm from public.dcc_campaigns where id=p_campaign_id;
 users:=array[gm];
 for r in select c.id,c.name,c.owner_user_id,c.dungeon_floor,c.crawler_level,c.advancement from public.dcc_crawlers c
  where c.id=any(p_crawler_ids) and c.campaign_id=p_campaign_id order by c.id for update loop
  changed:=not exists(select 1 from public.dcc_safe_room_access s where s.crawler_id=r.id and s.floor=r.dungeon_floor and s.allowed=p_allowed);
  if changed then
   insert into public.dcc_safe_room_access(crawler_id,floor,allowed) values(r.id,r.dungeon_floor,p_allowed)
   on conflict(crawler_id) do update set floor=excluded.floor,allowed=excluded.allowed,version=gen_random_uuid();
   users:=users||r.owner_user_id;
   if p_allowed then
    pending:=case when r.advancement->>'reconciled'='true' and r.dungeon_floor>=3 then (r.crawler_level-1)*3-(r.advancement->>'spent')::integer else 0 end;
    perform dcc_private.publish_table_event(p_campaign_id,array[gm,r.owner_user_id],'System AI','Saferoom open',
     format('%s is in a GM-confirmed saferoom on Floor %s. Open and claim loot boxes%s.',r.name,r.dungeon_floor,
      case when pending>0 then format(', and spend %s pending stat point(s)',pending) else '' end),
     format('saferoom:%s:%s',r.id,gen_random_uuid()),r.id,r.dungeon_floor);
   end if;
  end if;
 end loop;
 perform dcc_private.live_notify(users);
end $$;

-- In an open saferoom on Floor 3+, allocation may use every pending point without a
-- separate GM authorization. Otherwise the existing authorization path is unchanged.
alter function public.dcc_advancement_action(uuid,uuid,text,jsonb) set schema dcc_private;
alter function dcc_private.dcc_advancement_action(uuid,uuid,text,jsonb) rename to advancement_before_saferoom;
create function public.dcc_advancement_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_payload jsonb default '{}') returns void
language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype;a jsonb;baseline jsonb;spent integer;authorized integer;pending integer;total integer:=0;v integer;amount integer;k text;
begin
 if p_operation is distinct from 'allocate' or auth.uid() is null then
  perform dcc_private.advancement_before_saferoom(p_crawler_id,p_expected_version,p_operation,p_payload);return;
 end if;
 select * into r from public.dcc_crawlers where id=p_crawler_id for update;
 if not found or r.dungeon_floor<3 or not exists(select 1 from public.dcc_safe_room_access s where s.crawler_id=r.id and s.floor=r.dungeon_floor and s.allowed) then
  perform dcc_private.advancement_before_saferoom(p_crawler_id,p_expected_version,p_operation,p_payload);return;
 end if;
 if not dcc_private.is_member(r.campaign_id) or (r.owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(r.campaign_id)) then raise exception 'Crawler access denied.' using errcode='42501';end if;
 if r.ruleset<>'tutorial-v1' then raise exception 'Official crawler required.' using errcode='22023';end if;
 if r.version is distinct from p_expected_version then raise exception 'Crawler changed; refresh.' using errcode='40001';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid advancement action.' using errcode='22023';end if;
 a:=r.advancement;baseline:=r.stat_baseline;
 if a->>'reconciled'<>'true' then raise exception 'GM reconciliation required.' using errcode='22023';end if;
 spent:=(a->>'spent')::integer;authorized:=(a->>'authorized')::integer;pending:=(r.crawler_level-1)*3-spent;
 if jsonb_typeof(p_payload->'allocation') is distinct from 'object' then raise exception 'Enter five stat allocations.' using errcode='22023';end if;
 if (select count(*) from jsonb_object_keys(p_payload->'allocation'))<>5 then raise exception 'Enter exactly five stat allocations.' using errcode='22023';end if;
 foreach k in array array['strength','intelligence','constitution','dexterity','charisma'] loop
  v:=dcc_private.tutorial_int(p_payload#>array['allocation',k],0,greatest(pending,0));total:=total+v;
  amount:=(baseline#>>array[k,'base'])::integer+v;
  if amount>10000 then raise exception 'Stat exceeds supported range.' using errcode='22023';end if;
  baseline:=jsonb_set(baseline,array[k,'base'],to_jsonb(amount));
 end loop;
 if total<1 or total>pending then raise exception 'Allocation exceeds pending points or is empty.' using errcode='22023';end if;
 -- Spend any explicit GM authorization first and keep it within the remaining pending points.
 a:=jsonb_set(jsonb_set(a,'{spent}',to_jsonb(spent+total)),'{authorized}',to_jsonb(least(greatest(authorized-total,0),pending-total)));
 update public.dcc_crawlers set advancement=a,stat_baseline=baseline,version=gen_random_uuid() where id=r.id;
 insert into public.dcc_advancement_history(campaign_id,crawler_id,actor_user_id,operation,summary,reason,details)
 values(r.campaign_id,r.id,auth.uid(),'allocate',format('Allocated %s stat point(s) in an open saferoom',total),'',
  jsonb_build_object('previousLevel',r.crawler_level,'previousState',r.advancement,'allocation',p_payload->'allocation','points',total,'saferoom',true,
   'level',r.crawler_level,'state',a,'floor',r.dungeon_floor));
end $$;

revoke all on function dcc_private.advancement_before_saferoom(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.dcc_advancement_action(uuid,uuid,text,jsonb),public.dcc_set_saferoom(uuid,uuid[],boolean) from public,anon,authenticated;
grant execute on function public.dcc_advancement_action(uuid,uuid,text,jsonb),public.dcc_set_saferoom(uuid,uuid[],boolean) to authenticated;
notify pgrst,'reload schema';
commit;
