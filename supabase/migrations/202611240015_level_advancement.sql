begin;

-- Existing stats may already include manually applied level gains. Never infer spending.
alter table public.dcc_crawlers add column advancement jsonb not null
 default '{"reconciled":false,"spent":0,"authorized":0,"humanFavor":false}'::jsonb;
alter table public.dcc_crawlers alter column advancement set default
 '{"reconciled":true,"spent":0,"authorized":0,"humanFavor":false}'::jsonb;

create table public.dcc_advancement_history (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.dcc_campaigns(id) on delete cascade,
 crawler_id uuid not null references public.dcc_crawlers(id) on delete cascade,
 actor_user_id uuid references auth.users(id) on delete set null,
 operation text not null check(operation in ('reconcile','award','authorize','allocate','human-benefit')),
 summary text not null,
 reason text not null,
 details jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
create index dcc_advancement_history_campaign on public.dcc_advancement_history(campaign_id,created_at desc);
create index dcc_advancement_history_crawler on public.dcc_advancement_history(crawler_id,created_at desc);
alter table public.dcc_advancement_history enable row level security;
revoke all on public.dcc_advancement_history from public,anon,authenticated;
grant select on public.dcc_advancement_history to authenticated;
create policy dcc_advancement_history_read on public.dcc_advancement_history for select to authenticated
 using (exists(select 1 from public.dcc_crawlers c where c.id=crawler_id and c.campaign_id=dcc_advancement_history.campaign_id
  and dcc_private.is_member(c.campaign_id) and (c.owner_user_id=auth.uid() or dcc_private.is_gm(c.campaign_id))));

create function dcc_private.validate_advancement() returns trigger
language plpgsql security definer set search_path='' as $$
declare a jsonb; spent integer; authorized integer; total integer;
begin
 if new.ruleset<>'tutorial-v1' then return new; end if;
 a:=new.advancement;
 if jsonb_typeof(a) is distinct from 'object' then raise exception 'Invalid advancement data.' using errcode='22023';end if;
 if (select count(*) from jsonb_object_keys(a))<>4 or jsonb_typeof(a->'reconciled') is distinct from 'boolean'
  or jsonb_typeof(a->'humanFavor') is distinct from 'boolean' then raise exception 'Invalid advancement flags.' using errcode='22023';end if;
 if tg_op='UPDATE' then
  if new.dungeon_floor is distinct from old.dungeon_floor then
   a:=jsonb_set(a,'{authorized}','0');
   if (old.advancement->>'authorized')::integer>0 then
    insert into public.dcc_advancement_history(campaign_id,crawler_id,actor_user_id,operation,summary,reason,details)
    values(new.campaign_id,new.id,auth.uid(),'authorize','Saferoom authorization closed','Floor changed.',
     jsonb_build_object('fromFloor',old.dungeon_floor,'toFloor',new.dungeon_floor,'previousAuthorized',old.advancement->'authorized'));
   end if;
  end if;
 end if;
 if a->>'reconciled'='true' then
  if new.crawler_level not between 1 and 250 then raise exception 'Official level cap is 250.' using errcode='22023';end if;
  total:=(new.crawler_level-1)*3;
 else
  total:=0;
  if a->>'humanFavor'='true' then raise exception 'Reconcile advancement first.' using errcode='22023';end if;
 end if;
 spent:=dcc_private.tutorial_int(a->'spent',0,total);
 authorized:=dcc_private.tutorial_int(a->'authorized',0,total-spent);
 if new.dungeon_floor<3 and authorized>0 then raise exception 'Stat spending requires Floor 3 or deeper.' using errcode='22023';end if;
 new.advancement:=a;
 return new;
end $$;
create trigger dcc_advancement_validate before insert or update on public.dcc_crawlers
 for each row execute function dcc_private.validate_advancement();

create function public.dcc_advancement_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_payload jsonb default '{}') returns void
language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype; a jsonb; baseline jsonb; profile jsonb; gm boolean;
 level_now integer; spent integer; authorized integer; pending integer; amount integer; total integer:=0; v integer; favor integer:=0;
 k text; reason text:=''; summary text; details jsonb; source text;
begin
 if auth.uid() is null then raise exception 'Sign in first.' using errcode='42501';end if;
 select * into r from public.dcc_crawlers where id=p_crawler_id for update;
 if not found then raise exception 'Crawler access denied.' using errcode='42501';end if;
 gm:=dcc_private.is_gm(r.campaign_id);
 if not dcc_private.is_member(r.campaign_id) or (r.owner_user_id is distinct from auth.uid() and not gm) then raise exception 'Crawler access denied.' using errcode='42501';end if;
 if r.ruleset<>'tutorial-v1' then raise exception 'Official crawler required.' using errcode='22023';end if;
 if r.version is distinct from p_expected_version then raise exception 'Crawler changed; refresh.' using errcode='40001';end if;
 if p_operation is null or p_operation not in ('reconcile','award','authorize','allocate','human-benefit') or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid advancement action.' using errcode='22023';end if;
 if p_operation<>'allocate' and not gm then raise exception 'Only the GM manages advancement.' using errcode='42501';end if;
 if p_operation<>'allocate' then
  if jsonb_typeof(p_payload->'reason') is distinct from 'string' or length(btrim(p_payload->>'reason')) not between 1 and 500 then raise exception 'Enter a reason of 1 to 500 characters.' using errcode='22023';end if;
  reason:=btrim(p_payload->>'reason');
 end if;
 a:=r.advancement;baseline:=r.stat_baseline;profile:=r.tutorial_profile;level_now:=r.crawler_level;
 spent:=(a->>'spent')::integer;authorized:=(a->>'authorized')::integer;
 if p_operation<>'reconcile' and a->>'reconciled'<>'true' then raise exception 'GM reconciliation required.' using errcode='22023';end if;
 pending:=(level_now-1)*3-spent;
 details:=jsonb_build_object('previousLevel',level_now,'previousState',a);
 case p_operation
 when 'reconcile' then
  if a->>'reconciled'='true' then raise exception 'Already reconciled.' using errcode='22023';end if;
  if p_payload->'confirmed' is distinct from 'true'::jsonb then raise exception 'Confirm existing stats and previously spent points.' using errcode='22023';end if;
  level_now:=dcc_private.tutorial_int(p_payload->'level',1,250);
  spent:=dcc_private.tutorial_int(p_payload->'spent',0,(level_now-1)*3);
  a:=jsonb_build_object('reconciled',true,'spent',spent,'authorized',0,'humanFavor',false);
  details:=details||jsonb_build_object('reviewedBaseStats',baseline);
  summary:=format('Reconciled at Level %s; %s points already spent',level_now,spent);
 when 'award' then
  amount:=dcc_private.tutorial_int(p_payload->'amount',1,249);
  if level_now+amount>250 then raise exception 'Award exceeds Level 250.' using errcode='22023';end if;
  source:=p_payload->>'source';
  if jsonb_typeof(p_payload->'source') is distinct from 'string' or source not in ('two-hour','quest','boss','crawler-kill','grinding','other') then raise exception 'Choose an award source.' using errcode='22023';end if;
  level_now:=level_now+amount;
  if a->>'humanFavor'='true' and r.dungeon_floor>=3 then
   favor:=amount;
   if (profile->>'favor')::bigint+favor>2147483647 then raise exception 'Favor exceeds supported range.' using errcode='22023';end if;
   profile:=jsonb_set(profile,'{favor}',to_jsonb((profile->>'favor')::integer+favor));
  end if;
  summary:=format('Awarded %s level(s); Level %s; %s pending points added; %s Favor added',amount,level_now,amount*3,favor);
  details:=details||jsonb_build_object('source',source,'levels',amount,'points',amount*3,'favor',favor);
 when 'authorize' then
  amount:=dcc_private.tutorial_int(p_payload->'amount',0,pending);
  if amount>0 and (r.dungeon_floor<3 or p_payload->'saferoom' is distinct from 'true'::jsonb) then raise exception 'Confirm a saferoom on Floor 3 or deeper.' using errcode='22023';end if;
  a:=jsonb_set(a,'{authorized}',to_jsonb(amount));
  summary:=format('Saferoom spending authorized: %s point(s)',amount);
 when 'human-benefit' then
  if jsonb_typeof(p_payload->'enabled') is distinct from 'boolean' or p_payload->'confirmed' is distinct from 'true'::jsonb then raise exception 'Confirm the selected race benefit.' using errcode='22023';end if;
  if p_payload->>'enabled'='true' and r.dungeon_floor<3 then raise exception 'Human race selection requires Floor 3 or deeper.' using errcode='22023';end if;
  a:=jsonb_set(a,'{humanFavor}',p_payload->'enabled');
  summary:=case when p_payload->>'enabled'='true' then 'Selected Human race: Favor on future level gains enabled' else 'Human level-gain Favor disabled' end;
 when 'allocate' then
  if r.dungeon_floor<3 or authorized<1 then raise exception 'GM saferoom authorization required on Floor 3 or deeper.' using errcode='22023';end if;
  if jsonb_typeof(p_payload->'allocation') is distinct from 'object' then raise exception 'Enter five stat allocations.' using errcode='22023';end if;
  if (select count(*) from jsonb_object_keys(p_payload->'allocation'))<>5 then raise exception 'Enter exactly five stat allocations.' using errcode='22023';end if;
  foreach k in array array['strength','intelligence','constitution','dexterity','charisma'] loop
   v:=dcc_private.tutorial_int(p_payload#>array['allocation',k],0,authorized);total:=total+v;
   amount:=(baseline#>>array[k,'base'])::integer+v;
   if amount>10000 then raise exception 'Stat exceeds supported range.' using errcode='22023';end if;
   baseline:=jsonb_set(baseline,array[k,'base'],to_jsonb(amount));
  end loop;
  if total<1 or total>authorized or total>pending then raise exception 'Allocation exceeds authorized pending points or is empty.' using errcode='22023';end if;
  a:=jsonb_set(jsonb_set(a,'{spent}',to_jsonb(spent+total)),'{authorized}',to_jsonb(authorized-total));
  details:=details||jsonb_build_object('allocation',p_payload->'allocation','points',total);
  summary:=format('Allocated %s stat point(s)',total);
 end case;
 -- Existing effect/loadout triggers derive Enhanced, clamp Mana, and preserve health.
 update public.dcc_crawlers set crawler_level=level_now,advancement=a,stat_baseline=baseline,tutorial_profile=profile,version=gen_random_uuid() where id=r.id;
 insert into public.dcc_advancement_history(campaign_id,crawler_id,actor_user_id,operation,summary,reason,details)
 values(r.campaign_id,r.id,auth.uid(),p_operation,summary,reason,
  details||jsonb_build_object('level',level_now,'state',a,'floor',r.dungeon_floor));
end $$;

-- Retain installed sheet behavior while retiring the unrestricted metadata-level edit.
alter function public.dcc_sheet_action(uuid,uuid,text,jsonb) set schema dcc_private;
alter function dcc_private.dcc_sheet_action(uuid,uuid,text,jsonb) rename to sheet_before_advancement;
create function public.dcc_sheet_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_payload jsonb default '{}') returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_operation='level' then
  if auth.uid() is null or not exists(select 1 from public.dcc_crawlers where id=p_crawler_id and dcc_private.is_gm(campaign_id)) then
   raise exception 'Only the GM manages levels.' using errcode='42501';
  end if;
  raise exception 'Use level advancement to award or reconcile levels.' using errcode='22023';
 end if;
 perform dcc_private.sheet_before_advancement(p_crawler_id,p_expected_version,p_operation,p_payload);
end $$;

update public.dcc_crawlers set version=gen_random_uuid() where ruleset='tutorial-v1';
revoke all on function dcc_private.validate_advancement(),dcc_private.sheet_before_advancement(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.dcc_advancement_action(uuid,uuid,text,jsonb),public.dcc_sheet_action(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dcc_advancement_action(uuid,uuid,text,jsonb),public.dcc_sheet_action(uuid,uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
