begin;

-- Additive: no crawler, inventory, profile, advancement or selection data is rewritten.
create table public.dcc_floor_state (
 campaign_id uuid not null references public.dcc_campaigns(id) on delete cascade,
 floor integer not null check(floor between 1 and 18),
 version uuid not null default gen_random_uuid(),
 running boolean not null default false,
 deadline timestamptz,
 remaining integer not null default 0 check(remaining between 0 and 31536000),
 primary key(campaign_id,floor),
 check ((running and deadline is not null) or (not running and deadline is null))
);
create table public.dcc_table_events (
 sequence bigint generated always as identity primary key,
 campaign_id uuid not null references public.dcc_campaigns(id) on delete cascade,
 actor_user_id uuid references auth.users(id) on delete set null,
 crawler_id uuid references public.dcc_crawlers(id) on delete set null,
 floor integer check(floor between 1 and 18),
 category text not null check(category in ('System AI','Achievement','Floor Alert','Loot')),
 title text not null check(length(btrim(title)) between 1 and 120),
 body text not null check(length(body)<=2000),
 source_key text not null check(length(source_key) between 1 and 200),
 created_at timestamptz not null default clock_timestamp(),
 unique(campaign_id,source_key), unique(sequence,campaign_id)
);
create table public.dcc_event_recipients (
 event_sequence bigint not null,
 campaign_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 read_at timestamptz,
 primary key(event_sequence,user_id),
 foreign key(event_sequence,campaign_id) references public.dcc_table_events(sequence,campaign_id) on delete cascade
);
create index dcc_recipient_feed on public.dcc_event_recipients(user_id,campaign_id,event_sequence desc);
create index dcc_recipient_unread on public.dcc_event_recipients(user_id,campaign_id) where read_at is null;
create index dcc_event_recent_actor on public.dcc_table_events(campaign_id,actor_user_id,created_at);

alter table public.dcc_floor_state enable row level security;
alter table public.dcc_table_events enable row level security;
alter table public.dcc_event_recipients enable row level security;
revoke all on public.dcc_floor_state,public.dcc_table_events,public.dcc_event_recipients from public,anon,authenticated;
grant select on public.dcc_floor_state,public.dcc_table_events,public.dcc_event_recipients to authenticated;
create policy dcc_floor_read on public.dcc_floor_state for select to authenticated using(dcc_private.is_member(campaign_id));
create policy dcc_recipient_read on public.dcc_event_recipients for select to authenticated
 using(user_id=(select auth.uid()) and dcc_private.is_member(campaign_id));
create policy dcc_event_read on public.dcc_table_events for select to authenticated
 using(dcc_private.is_member(campaign_id) and exists(select 1 from public.dcc_event_recipients r where r.event_sequence=sequence and r.user_id=(select auth.uid())));

-- Payload-free invalidations reuse the private per-user live channel from 012.
create function dcc_private.publish_table_event(p_campaign uuid,p_users uuid[],p_category text,p_title text,p_body text,p_source text,p_crawler uuid default null,p_floor integer default null)
returns void language plpgsql security definer set search_path='' as $$
declare seq bigint;
begin
 insert into public.dcc_table_events(campaign_id,actor_user_id,category,title,body,source_key,crawler_id,floor)
 values(p_campaign,auth.uid(),p_category,p_title,p_body,p_source,p_crawler,p_floor)
 on conflict(campaign_id,source_key) do nothing returning sequence into seq;
 if seq is null then return;end if;
 insert into public.dcc_event_recipients(event_sequence,campaign_id,user_id)
 select seq,p_campaign,u from (select distinct unnest(p_users) u) recipients
 where u is not null and exists(select 1 from public.dcc_campaigns c where c.id=p_campaign and c.gm_user_id=u
 union all select 1 from public.dcc_campaign_members m where m.campaign_id=p_campaign and m.user_id=u);
 perform dcc_private.live_notify(p_users);
end $$;

create function public.dcc_hud_snapshot(p_campaign_id uuid,p_floor integer,p_before bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;oldest bigint;head bigint;timer jsonb;
begin
 if auth.uid() is null or not dcc_private.is_member(p_campaign_id) then raise exception 'Game access denied.' using errcode='42501';end if;
 if p_floor is null or p_floor not between 1 and 18 or p_before<0 then raise exception 'Invalid floor or cursor.' using errcode='22023';end if;
 select jsonb_build_object('floor',floor,'version',version,'running',running,'deadline',deadline,'remaining',remaining) into timer
 from public.dcc_floor_state where campaign_id=p_campaign_id and floor=p_floor;
 select coalesce(max(event_sequence),0) into head from public.dcc_event_recipients where campaign_id=p_campaign_id and user_id=auth.uid();
 select coalesce(jsonb_agg(row.data order by row.sequence desc),'[]'),min(row.sequence) into result,oldest from (
  select e.sequence,jsonb_build_object('sequence',e.sequence::text,'category',e.category,'title',e.title,'body',e.body,
   'createdAt',e.created_at,'readAt',r.read_at,'crawlerId',e.crawler_id,'floor',e.floor) data
  from public.dcc_table_events e join public.dcc_event_recipients r on r.event_sequence=e.sequence
  where r.campaign_id=p_campaign_id and r.user_id=auth.uid() and (p_before is null or e.sequence<p_before)
  order by e.sequence desc limit 30
 ) row;
 -- A committed arrival between the two reads must not be announced twice.
 head:=greatest(head,coalesce((result#>>'{0,sequence}')::bigint,0));
 return jsonb_build_object('events',result,'head',head::text,'timer',timer,'serverNow',clock_timestamp(),
  'unread',(select count(*) from public.dcc_event_recipients where campaign_id=p_campaign_id and user_id=auth.uid() and read_at is null),
  'hasMore',exists(select 1 from public.dcc_event_recipients where campaign_id=p_campaign_id and user_id=auth.uid() and event_sequence<oldest));
end $$;

create function public.dcc_hud_action(p_campaign_id uuid,p_operation text,p_payload jsonb default '{}')
returns void language plpgsql security definer set search_path='' as $$
declare gm uuid;users uuid[];target public.dcc_crawlers%rowtype;f integer;t public.dcc_floor_state%rowtype;
 expected uuid;duration integer;seq bigint;key text;is_running boolean;
begin
 if auth.uid() is null or not dcc_private.is_member(p_campaign_id) then raise exception 'Game access denied.' using errcode='42501';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_operation is null then raise exception 'Invalid HUD action.' using errcode='22023';end if;
 select gm_user_id into gm from public.dcc_campaigns where id=p_campaign_id;
 if p_operation in ('read','read-all') then
  if coalesce(p_payload->>case when p_operation='read' then 'sequence' else 'through' end,'') !~ '^[0-9]{1,19}$' then raise exception 'Invalid notification cursor.' using errcode='22023';end if;
  seq:=(p_payload->>case when p_operation='read' then 'sequence' else 'through' end)::bigint;
  if p_operation='read' and not exists(select 1 from public.dcc_event_recipients where campaign_id=p_campaign_id and user_id=auth.uid() and event_sequence=seq) then raise exception 'Notification access denied.' using errcode='42501';end if;
  update public.dcc_event_recipients set read_at=clock_timestamp()
  where campaign_id=p_campaign_id and user_id=auth.uid() and read_at is null
   and (case when p_operation='read' then event_sequence=seq else event_sequence<=seq end);
  if found then perform dcc_private.live_notify(array[auth.uid()]);end if;
  return;
 end if;
 if gm is distinct from auth.uid() then raise exception 'Only the GM manages table controls.' using errcode='42501';end if;
 if p_operation='broadcast' then
  if jsonb_typeof(p_payload->'title') is distinct from 'string' or length(btrim(p_payload->>'title')) not between 1 and 120
   or jsonb_typeof(p_payload->'body') is distinct from 'string' or length(btrim(p_payload->>'body')) not between 1 and 2000
   or coalesce(p_payload->>'category','') not in ('System AI','Achievement','Floor Alert','Loot')
   or jsonb_typeof(p_payload->'requestId') is distinct from 'string' then raise exception 'Invalid broadcast.' using errcode='22023';end if;
  key:='broadcast:'||auth.uid()::text||':'||(p_payload->>'requestId')::uuid::text;
  perform pg_advisory_xact_lock(hashtextextended(p_campaign_id::text,23));
  if exists(select 1 from public.dcc_table_events where campaign_id=p_campaign_id and source_key=key) then return;end if;
  if (select count(*) from public.dcc_table_events where campaign_id=p_campaign_id and actor_user_id=auth.uid() and source_key like 'broadcast:%' and created_at>clock_timestamp()-interval '1 minute')>=20 then raise exception 'Broadcast limit reached.' using errcode='54000';end if;
  if p_payload->>'crawlerId' is not null then
   select * into target from public.dcc_crawlers where id=(p_payload->>'crawlerId')::uuid and campaign_id=p_campaign_id;
   if not found then raise exception 'Crawler access denied.' using errcode='42501';end if;
   users:=array[gm,target.owner_user_id];
  else select array_agg(u) into users from(select gm u union select owner_user_id from public.dcc_crawlers where campaign_id=p_campaign_id) recipients;end if;
  perform dcc_private.publish_table_event(p_campaign_id,users,p_payload->>'category',btrim(p_payload->>'title'),btrim(p_payload->>'body'),key,target.id,target.dungeon_floor);
  return;
 end if;
 if p_operation not in ('timer-set','timer-pause','timer-resume','timer-clear') then raise exception 'Unknown HUD action.' using errcode='22023';end if;
 f:=dcc_private.tutorial_int(p_payload->'floor',1,18);
 expected:=(p_payload->>'version')::uuid;
 perform pg_advisory_xact_lock(hashtextextended(p_campaign_id::text||':'||f::text,22));
 select * into t from public.dcc_floor_state where campaign_id=p_campaign_id and floor=f for update;
 if t.version is distinct from expected then raise exception 'Timer changed; reopen controls.' using errcode='40001';end if;
 if p_operation='timer-set' then
  duration:=dcc_private.tutorial_int(p_payload->'seconds',0,31536000);
  if jsonb_typeof(p_payload->'start') is distinct from 'boolean' then raise exception 'Choose timer state.' using errcode='22023';end if;
  is_running:=(p_payload->>'start')::boolean;
 elsif t.version is null then raise exception 'Set the timer first.' using errcode='22023';
 elsif p_operation='timer-pause' then
  if not t.running then raise exception 'Timer is already paused.' using errcode='22023';end if;
  duration:=greatest(0,ceil(extract(epoch from t.deadline-clock_timestamp()))::integer);is_running:=false;
 elsif p_operation='timer-resume' then
  if t.running then raise exception 'Timer is already running.' using errcode='22023';end if;
  duration:=t.remaining;is_running:=true;
 else duration:=0;is_running:=false;end if;
 if is_running and duration=0 then raise exception 'Timer needs time remaining.' using errcode='22023';end if;
 insert into public.dcc_floor_state(campaign_id,floor,running,deadline,remaining)
 values(p_campaign_id,f,is_running,case when is_running then clock_timestamp()+make_interval(secs=>duration) else null end,duration)
 on conflict(campaign_id,floor) do update set running=excluded.running,deadline=excluded.deadline,remaining=excluded.remaining,version=gen_random_uuid();
 select array_agg(u) into users from(select gm u union select user_id from public.dcc_campaign_members where campaign_id=p_campaign_id) recipients;
 perform dcc_private.live_notify(users);
 -- Timer expiry is display-only: no floor movement, damage or background jobs.
end $$;

create function dcc_private.hud_health_alert() returns trigger language plpgsql security definer set search_path='' as $$
declare gm uuid;
begin
 if old.ruleset='tutorial-v1' and new.ruleset='tutorial-v1' and old.current_segments>=3 and new.current_segments<3 then
  select gm_user_id into gm from public.dcc_campaigns where id=new.campaign_id;
  perform dcc_private.publish_table_event(new.campaign_id,array[gm,new.owner_user_id],'System AI','Health below 30%',
   format('%s is at %s%% Health%s.',new.name,new.current_segments*10,case when new.current_segments=0 then ' · Dying' else '' end),
   'health:'||new.id::text||':'||new.version::text,new.id,new.dungeon_floor);
 end if;return null;
end $$;
create trigger dcc_hud_health after update on public.dcc_crawlers for each row execute function dcc_private.hud_health_alert();

create function dcc_private.hud_advancement_alert() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype;gm uuid;amount integer;
begin
 amount:=coalesce((new.details#>>'{state,authorized}')::integer,0);
 if new.operation='authorize' and amount>0 and amount is distinct from (new.details#>>'{previousState,authorized}')::integer then
  select * into r from public.dcc_crawlers where id=new.crawler_id;
  select gm_user_id into gm from public.dcc_campaigns where id=new.campaign_id;
  perform dcc_private.publish_table_event(new.campaign_id,array[gm,r.owner_user_id],'System AI','Stat points authorized',
   format('The GM authorized %s level-up stat point(s) for %s in a saferoom on Floor %s.',amount,r.name,r.dungeon_floor),
   'advancement:'||new.id::text,r.id,r.dungeon_floor);
 end if;return null;
end $$;
create trigger dcc_hud_advancement after insert on public.dcc_advancement_history for each row execute function dcc_private.hud_advancement_alert();

-- Wrap the installed 013 ability action so unmarking a Skill never impersonates
-- a resolved advancement. Its existing permissions, rolls and linked effects remain authoritative.
alter function public.dcc_skill_action(uuid,uuid,text,text,jsonb,boolean,boolean,text,integer,integer) set schema dcc_private;
alter function dcc_private.dcc_skill_action(uuid,uuid,text,text,jsonb,boolean,boolean,text,integer,integer) rename to skill_before_hud;
create function public.dcc_skill_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_skill_id text default null,p_definition jsonb default null,p_marked boolean default null,p_confirmed boolean default false,p_window text default null,p_die integer default null,p_modifier integer default 0)
returns void language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype;a jsonb;gm uuid;
begin
 perform dcc_private.skill_before_hud(p_crawler_id,p_expected_version,p_operation,p_skill_id,p_definition,p_marked,p_confirmed,p_window,p_die,p_modifier);
 if p_operation='advance' then
  select * into r from public.dcc_crawlers where id=p_crawler_id;
  select x into a from jsonb_array_elements(r.learned_skills) x where x->>'id'=p_skill_id;
  select gm_user_id into gm from public.dcc_campaigns where id=r.campaign_id;
  perform dcc_private.publish_table_event(r.campaign_id,array[gm,r.owner_user_id],'System AI','Skill advancement resolved',
   format('%s · %s: Rank %s → %s. Advancement mark resolved.',r.name,a->>'name',a#>>'{lastAdvancement,fromRank}',a->>'rank'),
   'skill:'||r.id::text||':'||r.version::text,r.id,r.dungeon_floor);
 end if;
end $$;

revoke all on function dcc_private.publish_table_event(uuid,uuid[],text,text,text,text,uuid,integer),dcc_private.hud_health_alert(),dcc_private.hud_advancement_alert(),dcc_private.skill_before_hud(uuid,uuid,text,text,jsonb,boolean,boolean,text,integer,integer) from public,anon,authenticated;
revoke all on function public.dcc_hud_snapshot(uuid,integer,bigint),public.dcc_hud_action(uuid,text,jsonb),public.dcc_skill_action(uuid,uuid,text,text,jsonb,boolean,boolean,text,integer,integer) from public,anon,authenticated;
grant execute on function public.dcc_hud_snapshot(uuid,integer,bigint),public.dcc_hud_action(uuid,text,jsonb),public.dcc_skill_action(uuid,uuid,text,text,jsonb,boolean,boolean,text,integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;
