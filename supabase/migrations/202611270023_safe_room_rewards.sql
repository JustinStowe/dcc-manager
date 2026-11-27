begin;
-- Reward records are separate from the one existing crawler inventory. No backfill/grants.
create table public.dcc_safe_room_access (
 crawler_id uuid primary key references public.dcc_crawlers(id) on delete cascade,
 floor integer not null check(floor between 1 and 18), allowed boolean not null,
 version uuid not null default gen_random_uuid()
);
create table public.dcc_achievements (
 id uuid primary key default gen_random_uuid(), sequence bigint generated always as identity unique,
 crawler_id uuid not null references public.dcc_crawlers(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 120),
 floor integer not null check(floor between 1 and 18),
 trigger_text text not null check(length(btrim(trigger_text)) between 1 and 1000),
 description text not null check(length(btrim(description)) between 1 and 2000),
 reward_text text not null default '' check(length(reward_text)<=1000),
 recorded_existing boolean not null default false, created_at timestamptz not null default clock_timestamp()
);
create index dcc_achievements_crawler on public.dcc_achievements(crawler_id,sequence desc);
create table public.dcc_achievement_reads (
 achievement_id uuid not null references public.dcc_achievements(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 read_at timestamptz not null default clock_timestamp(), primary key(achievement_id,user_id)
);
create table public.dcc_loot_boxes (
 id uuid primary key default gen_random_uuid(), sequence bigint generated always as identity unique,
 crawler_id uuid not null references public.dcc_crawlers(id) on delete cascade,
 achievement_id uuid unique references public.dcc_achievements(id) on delete set null,
 version uuid not null default gen_random_uuid(),
 tier text not null check(tier in ('bronze','silver','gold','platinum','legendary','celestial')),
 name text not null check(length(btrim(name)) between 1 and 120),
 category text not null check(length(btrim(category)) between 1 and 80),
 flavor text not null default '' check(length(flavor)<=2000),
 ai_note text not null default '' check(length(ai_note)<=2000),
 guide_note text not null default '' check(length(guide_note)<=2000),
 vote_locked boolean not null default false, opened_at timestamptz,
 recorded_existing boolean not null default false, created_at timestamptz not null default clock_timestamp()
);
create index dcc_boxes_crawler on public.dcc_loot_boxes(crawler_id,sequence desc);
create table public.dcc_loot_box_items (
 id uuid primary key default gen_random_uuid(),
 box_id uuid not null references public.dcc_loot_boxes(id) on delete cascade,
 item jsonb not null, claimed_at timestamptz
);
create index dcc_box_items_box on public.dcc_loot_box_items(box_id);
create table public.dcc_reward_awards (
 crawler_id uuid not null references public.dcc_crawlers(id) on delete cascade,
 request_id uuid not null, actor_user_id uuid references auth.users(id) on delete set null,
 achievement_id uuid references public.dcc_achievements(id) on delete set null,
 box_id uuid references public.dcc_loot_boxes(id) on delete set null,
 primary key(crawler_id,request_id)
);
create table public.dcc_incentive_reviews (
 crawler_id uuid primary key references public.dcc_crawlers(id) on delete cascade,
 status text not null check(status in ('issued','reconciled')),
 box_id uuid references public.dcc_loot_boxes(id) on delete set null,
 note text not null check(length(btrim(note)) between 1 and 500),
 actor_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default clock_timestamp()
);

create function dcc_private.can_read_rewards(p_crawler uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.dcc_crawlers c where c.id=p_crawler
  and dcc_private.is_member(c.campaign_id) and (c.owner_user_id=auth.uid() or dcc_private.is_gm(c.campaign_id)))
$$;
revoke all on function dcc_private.can_read_rewards(uuid) from public,anon;
grant execute on function dcc_private.can_read_rewards(uuid) to authenticated;
alter table public.dcc_safe_room_access enable row level security;
alter table public.dcc_achievements enable row level security;
alter table public.dcc_achievement_reads enable row level security;
alter table public.dcc_loot_boxes enable row level security;
alter table public.dcc_loot_box_items enable row level security;
alter table public.dcc_reward_awards enable row level security;
alter table public.dcc_incentive_reviews enable row level security;
revoke all on public.dcc_safe_room_access,public.dcc_achievements,public.dcc_achievement_reads,public.dcc_loot_boxes,public.dcc_loot_box_items,public.dcc_reward_awards,public.dcc_incentive_reviews from public,anon,authenticated;
grant select on public.dcc_safe_room_access,public.dcc_achievements,public.dcc_achievement_reads,public.dcc_loot_boxes,public.dcc_loot_box_items,public.dcc_reward_awards,public.dcc_incentive_reviews to authenticated;
create policy dcc_room_access_read on public.dcc_safe_room_access for select to authenticated using(dcc_private.can_read_rewards(crawler_id));
create policy dcc_achievement_read on public.dcc_achievements for select to authenticated using(dcc_private.can_read_rewards(crawler_id));
create policy dcc_achievement_receipt_read on public.dcc_achievement_reads for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.dcc_achievements a where a.id=achievement_id));
create policy dcc_box_read on public.dcc_loot_boxes for select to authenticated using(dcc_private.can_read_rewards(crawler_id));
create policy dcc_box_item_read on public.dcc_loot_box_items for select to authenticated using(exists(
 select 1 from public.dcc_loot_boxes b join public.dcc_crawlers c on c.id=b.crawler_id
 where b.id=box_id and dcc_private.can_read_rewards(c.id) and (b.opened_at is not null or dcc_private.is_gm(c.campaign_id))));
create policy dcc_award_read on public.dcc_reward_awards for select to authenticated using(dcc_private.can_read_rewards(crawler_id));
create policy dcc_incentive_read on public.dcc_incentive_reviews for select to authenticated using(dcc_private.can_read_rewards(crawler_id));

create function dcc_private.reward_box_json(b public.dcc_loot_boxes) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',b.id,'sequence',b.sequence::text,'version',b.version,'name',b.name,'category',b.category,'tier',b.tier,
  'flavor',b.flavor,'aiNote',b.ai_note,'guideNote',b.guide_note,'sourceAchievementId',b.achievement_id,
  'voteLocked',b.vote_locked,'openedAt',b.opened_at,'createdAt',b.created_at,'existing',b.recorded_existing,
  'status',case when b.opened_at is null then 'unopened' when exists(select 1 from public.dcc_loot_box_items i where i.box_id=b.id and i.claimed_at is null) then 'opened' else 'claimed' end,
  'items',case when b.opened_at is not null or exists(select 1 from public.dcc_crawlers c where c.id=b.crawler_id and dcc_private.is_gm(c.campaign_id))
   then (select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'item',i.item,'claimedAt',i.claimed_at) order by i.id),'[]') from public.dcc_loot_box_items i where i.box_id=b.id) else null end)
$$;
create function dcc_private.reward_achievement_json(a public.dcc_achievements) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',a.id,'sequence',a.sequence::text,'title',a.title,'floor',a.floor,'trigger',a.trigger_text,'description',a.description,'rewardText',a.reward_text,
  'boxId',(select b.id from public.dcc_loot_boxes b where b.achievement_id=a.id),'createdAt',a.created_at,'existing',a.recorded_existing,
  'readAt',(select r.read_at from public.dcc_achievement_reads r where r.achievement_id=a.id and r.user_id=auth.uid()))
$$;
create function public.dcc_safe_room_snapshot(p_crawler_id uuid,p_query jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.dcc_crawlers%rowtype;boxes jsonb;achievements jsonb;selected_box jsonb;selected_achievement jsonb;
 box_before bigint;achievement_before bigint;head bigint;f text;s text;term text;v_tier text;hide_claimed boolean;access public.dcc_safe_room_access%rowtype;
begin
 if not dcc_private.can_read_rewards(p_crawler_id) then raise exception 'Crawler access denied.' using errcode='42501';end if;
 if jsonb_typeof(p_query) is distinct from 'object' then raise exception 'Invalid query.' using errcode='22023';end if;
 select * into c from public.dcc_crawlers where id=p_crawler_id;
 f:=coalesce(p_query->>'floor','all');s:=coalesce(p_query->>'status','all');term:=coalesce(p_query->>'search','');v_tier:=coalesce(p_query->>'tier','all');
 if f not in ('all','1','2','3','4+') or s not in ('all','unread','with-box') or length(term)>120 or v_tier not in ('all','bronze','silver','gold','platinum','legendary','celestial') then raise exception 'Invalid filters.' using errcode='22023';end if;
 if p_query?'hideClaimed' and jsonb_typeof(p_query->'hideClaimed') is distinct from 'boolean' then raise exception 'Invalid filter.' using errcode='22023';end if;
 hide_claimed:=coalesce((p_query->>'hideClaimed')::boolean,true);
 box_before:=(p_query->>'boxBefore')::bigint;achievement_before:=(p_query->>'achievementBefore')::bigint;
 select * into access from public.dcc_safe_room_access where crawler_id=c.id;
 select coalesce(max(sequence),0) into head from public.dcc_achievements where crawler_id=c.id;
 select coalesce(jsonb_agg(dcc_private.reward_box_json(b) order by b.sequence desc),'[]') into boxes from (
  select b.* from public.dcc_loot_boxes b where b.crawler_id=c.id and (box_before is null or b.sequence<box_before) and (v_tier='all' or b.tier=v_tier)
   and (not hide_claimed or b.opened_at is null or exists(select 1 from public.dcc_loot_box_items i where i.box_id=b.id and i.claimed_at is null))
  order by b.sequence desc limit 26
 ) b;
 select coalesce(jsonb_agg(dcc_private.reward_achievement_json(a) order by a.sequence desc),'[]') into achievements from (
  select a.* from public.dcc_achievements a where a.crawler_id=c.id and (achievement_before is null or a.sequence<achievement_before)
   and (f='all' or f='4+' and a.floor>=4 or f<>'4+' and a.floor::text=f)
   and (term='' or strpos(lower(a.title||' '||a.trigger_text||' '||a.description),lower(term))>0)
   and (s<>'unread' or not exists(select 1 from public.dcc_achievement_reads r where r.achievement_id=a.id and r.user_id=auth.uid()))
   and (s<>'with-box' or exists(select 1 from public.dcc_loot_boxes b where b.achievement_id=a.id))
  order by a.sequence desc limit 31
 ) a;
 select dcc_private.reward_box_json(b) into selected_box from public.dcc_loot_boxes b where b.id=(p_query->>'boxId')::uuid and b.crawler_id=c.id;
 select dcc_private.reward_achievement_json(a) into selected_achievement from public.dcc_achievements a where a.id=(p_query->>'achievementId')::uuid and a.crawler_id=c.id;
 head:=greatest(head,coalesce((achievements#>>'{0,sequence}')::bigint,0));
 return jsonb_build_object('crawlerId',c.id,'crawlerVersion',c.version,'floor',c.dungeon_floor,
  'access',jsonb_build_object('allowed',coalesce(access.allowed and access.floor=c.dungeon_floor,false),'version',access.version),
  'boxes',boxes-25,'achievements',achievements-30,'selectedBox',selected_box,'selectedAchievement',selected_achievement,
  'boxMore',jsonb_array_length(boxes)>25,'achievementMore',jsonb_array_length(achievements)>30,'achievementHead',head::text,
  'unopened',(select count(*) from public.dcc_loot_boxes b where b.crawler_id=c.id and b.opened_at is null),
  'achievementCount',(select count(*) from public.dcc_achievements a where a.crawler_id=c.id),
  'unreadAchievements',(select count(*) from public.dcc_achievements a where a.crawler_id=c.id and not exists(select 1 from public.dcc_achievement_reads r where r.achievement_id=a.id and r.user_id=auth.uid())),
  'storedEntries',(select count(*) from jsonb_array_elements(c.inventory) i where i->>'location'='stored'),
  'incentive',coalesce((select status from public.dcc_incentive_reviews where crawler_id=c.id),nullif(c.progression->>'rewardDecision',''),'unreviewed'));
end $$;

create function public.dcc_safe_room_action(p_crawler_id uuid,p_operation text,p_payload jsonb default '{}') returns void
language plpgsql security definer set search_path='' as $$
declare c public.dcc_crawlers%rowtype;b public.dcc_loot_boxes%rowtype;access public.dcc_safe_room_access%rowtype;
 gm uuid;users uuid[];is_gm boolean;aid uuid;bid uuid;request uuid;existing boolean;source text;entry jsonb;item jsonb;item_id uuid;
 created timestamptz:=clock_timestamp();v_inventory jsonb;pending integer;achievement jsonb;box jsonb;decision text;
begin
 select * into c from public.dcc_crawlers where id=p_crawler_id for update;
 if not found or not dcc_private.can_read_rewards(c.id) then raise exception 'Crawler access denied.' using errcode='42501';end if;
 if c.ruleset<>'tutorial-v1' then raise exception 'Official crawler required.' using errcode='22023';end if;
 if p_operation is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid reward action.' using errcode='22023';end if;
 select gm_user_id into gm from public.dcc_campaigns where id=c.campaign_id;
 users:=array[gm,c.owner_user_id];is_gm:=gm=auth.uid();decision:=c.progression->>'rewardDecision';
 if p_operation in ('award','access','unlock','reconcile-incentive') and not is_gm then raise exception 'GM reward controls only.' using errcode='42501';end if;
 if p_operation='access' then
  select * into access from public.dcc_safe_room_access where crawler_id=c.id for update;
  if access.version is distinct from (p_payload->>'version')::uuid then raise exception 'Access changed.' using errcode='40001';end if;
  if dcc_private.tutorial_int(p_payload->'floor',1,18)<>c.dungeon_floor or jsonb_typeof(p_payload->'allowed') is distinct from 'boolean' then raise exception 'Confirm current floor saferoom access.' using errcode='22023';end if;
  insert into public.dcc_safe_room_access(crawler_id,floor,allowed) values(c.id,c.dungeon_floor,(p_payload->>'allowed')::boolean)
  on conflict(crawler_id) do update set floor=excluded.floor,allowed=excluded.allowed,version=gen_random_uuid();
 elsif p_operation='reconcile-incentive' then
  if p_payload->'reviewed' is distinct from 'true'::jsonb or decision is null or decision not in ('issue-once','already-received') or jsonb_typeof(p_payload->'note') is distinct from 'string' or length(btrim(p_payload->>'note')) not between 1 and 500 then raise exception 'Review the existing single incentive first.' using errcode='22023';end if;
  insert into public.dcc_incentive_reviews(crawler_id,status,note,actor_user_id) values(c.id,'reconciled',btrim(p_payload->>'note'),auth.uid());
 elsif p_operation='award' then
  if p_payload->'reviewed' is distinct from 'true'::jsonb or jsonb_typeof(p_payload->'existing') is distinct from 'boolean' or jsonb_typeof(p_payload->'requestId') is distinct from 'string' then raise exception 'Confirm reward review.' using errcode='22023';end if;
  request:=(p_payload->>'requestId')::uuid;
  if exists(select 1 from public.dcc_reward_awards where crawler_id=c.id and request_id=request) then return;end if;
  existing:=(p_payload->>'existing')::boolean;source:=p_payload->>'source';achievement:=p_payload->'achievement';box:=p_payload->'box';
  if source is null or source not in ('manual','earth-incentive') or (coalesce(achievement,'null')='null' and coalesce(box,'null')='null') then raise exception 'Add a reward.' using errcode='22023';end if;
  if source='earth-incentive' then
   if decision is null or decision not in ('issue-once','already-received') or not existing and decision<>'issue-once' or coalesce(box,'null')='null' then raise exception 'Single Earth incentive decision required.' using errcode='22023';end if;
   if exists(select 1 from public.dcc_incentive_reviews where crawler_id=c.id) then raise exception 'Earth incentive already fulfilled.' using errcode='23505';end if;
  end if;
  if coalesce(achievement,'null')<>'null' then
   if jsonb_typeof(achievement) is distinct from 'object' or jsonb_typeof(achievement->'title') is distinct from 'string' or jsonb_typeof(achievement->'trigger') is distinct from 'string' or jsonb_typeof(achievement->'description') is distinct from 'string' or jsonb_typeof(achievement->'rewardText') is distinct from 'string' then raise exception 'Invalid achievement.' using errcode='22023';end if;
   insert into public.dcc_achievements(crawler_id,title,floor,trigger_text,description,reward_text,recorded_existing)
   values(c.id,btrim(achievement->>'title'),dcc_private.tutorial_int(achievement->'floor',1,18),btrim(achievement->>'trigger'),btrim(achievement->>'description'),btrim(achievement->>'rewardText'),existing) returning id into aid;
  end if;
  if coalesce(box,'null')<>'null' then
   if jsonb_typeof(box) is distinct from 'object' or jsonb_typeof(box->'items') is distinct from 'array' or jsonb_typeof(box->'voteLocked') is distinct from 'boolean' then raise exception 'Invalid box.' using errcode='22023';end if;
   if jsonb_array_length(box->'items') not between 1 and 20 then raise exception 'Enter 1 to 20 reward entries.' using errcode='22023';end if;
   if box->>'sourceAchievementId' is not null then
    if aid is not null or not exists(select 1 from public.dcc_achievements where id=(box->>'sourceAchievementId')::uuid and crawler_id=c.id) then raise exception 'Choose an achievement belonging to this crawler.' using errcode='42501';end if;
    aid:=(box->>'sourceAchievementId')::uuid;
   end if;
   insert into public.dcc_loot_boxes(crawler_id,achievement_id,tier,name,category,flavor,ai_note,guide_note,vote_locked,opened_at,recorded_existing)
   values(c.id,aid,box->>'tier',btrim(box->>'name'),btrim(box->>'category'),box->>'flavor',box->>'aiNote',box->>'guideNote',not existing and (box->>'voteLocked')::boolean,case when existing then created else null end,existing) returning id into bid;
   for entry in select value from jsonb_array_elements(box->'items') loop
    item:=jsonb_build_object('name',btrim(entry->>'name'),'kind',entry->'kind','quantity',entry->'quantity','notes',entry->'notes','gearSlot',entry->'gearSlot','effect',entry->'effect','bonuses',entry->'bonuses');
    perform dcc_private.validate_inventory(jsonb_build_array(item||jsonb_build_object('id',gen_random_uuid(),'location','stored')));
    insert into public.dcc_loot_box_items(box_id,item,claimed_at) values(bid,item,case when existing then created else null end);
   end loop;
  end if;
  insert into public.dcc_reward_awards(crawler_id,request_id,actor_user_id,achievement_id,box_id) values(c.id,request,auth.uid(),aid,bid);
  if source='earth-incentive' then insert into public.dcc_incentive_reviews(crawler_id,status,box_id,note,actor_user_id)
   values(c.id,case when existing then 'reconciled' else 'issued' end,bid,'GM reviewed the existing single Earth incentive decision before recording this box.',auth.uid());end if;
  if coalesce(achievement,'null')<>'null' then perform dcc_private.publish_table_event(c.campaign_id,users,case when existing then 'System AI' else 'Achievement' end,achievement->>'title',achievement->>'description','achievement:'||aid::text,c.id,(achievement->>'floor')::integer);end if;
  if bid is not null then perform dcc_private.publish_table_event(c.campaign_id,users,'Loot',case when existing then 'Past reward recorded' else 'Loot box awarded' end,box->>'name','box-award:'||bid::text,c.id,c.dungeon_floor);end if;
 elsif p_operation in ('read','read-all') then
  if p_operation='read' and not exists(select 1 from public.dcc_achievements where id=(p_payload->>'achievementId')::uuid and crawler_id=c.id) then raise exception 'Achievement access denied.' using errcode='42501';end if;
  if p_operation='read-all' and coalesce(p_payload->>'through','')!~'^[0-9]{1,19}$' then raise exception 'Invalid read cursor.' using errcode='22023';end if;
  insert into public.dcc_achievement_reads(achievement_id,user_id)
  select a.id,auth.uid() from public.dcc_achievements a where a.crawler_id=c.id and (case when p_operation='read' then a.id=(p_payload->>'achievementId')::uuid else a.sequence<=(p_payload->>'through')::bigint end)
  on conflict(achievement_id,user_id) do nothing;
 elsif p_operation in ('open','claim','unlock') then
  select * into b from public.dcc_loot_boxes where id=(p_payload->>'boxId')::uuid and crawler_id=c.id for update;
  if not found then raise exception 'Box access denied.' using errcode='42501';end if;
  if p_operation='open' and b.opened_at is not null then return;end if;
  if p_operation='claim' then
   item_id:=(p_payload->>'itemId')::uuid;
   if item_id is not null and not exists(select 1 from public.dcc_loot_box_items where id=item_id and box_id=b.id) then raise exception 'Reward item access denied.' using errcode='42501';end if;
   select count(*) into pending from public.dcc_loot_box_items where box_id=b.id and claimed_at is null and (item_id is null or id=item_id);
   if pending=0 then return;end if;
  end if;
  if b.version is distinct from (p_payload->>'version')::uuid then raise exception 'Box changed.' using errcode='40001';end if;
  if p_operation='unlock' then
   if p_payload->'confirmed' is distinct from 'true'::jsonb or b.opened_at is not null then raise exception 'Review the vote result before release.' using errcode='22023';end if;
   update public.dcc_loot_boxes set vote_locked=false,version=gen_random_uuid() where id=b.id;
  else
   if not exists(select 1 from public.dcc_safe_room_access where crawler_id=c.id and floor=c.dungeon_floor and allowed) or b.vote_locked then raise exception 'GM-confirmed saferoom access and an unlocked box are required.' using errcode='22023';end if;
   if p_operation='open' then
    update public.dcc_loot_boxes set opened_at=created,version=gen_random_uuid() where id=b.id;
    perform dcc_private.publish_table_event(c.campaign_id,users,'Loot','Loot box opened',b.name,'box-open:'||b.id::text,c.id,c.dungeon_floor);
   else
    if b.opened_at is null then raise exception 'Open the box first.' using errcode='22023';end if;
    if c.version is distinct from (p_payload->>'crawlerVersion')::uuid then raise exception 'Crawler changed.' using errcode='40001';end if;
    if jsonb_array_length(c.inventory)+pending>200 then raise exception 'Inventory is full.' using errcode='54000';end if;
    select c.inventory||coalesce(jsonb_agg(i.item||jsonb_build_object('id',i.id,'location','stored') order by i.id),'[]') into v_inventory
    from public.dcc_loot_box_items i where i.box_id=b.id and i.claimed_at is null and (item_id is null or i.id=item_id);
    perform dcc_private.validate_inventory(v_inventory);
    update public.dcc_crawlers set inventory=v_inventory,version=gen_random_uuid() where id=c.id;
    update public.dcc_loot_box_items set claimed_at=created where box_id=b.id and claimed_at is null and (item_id is null or id=item_id);
    update public.dcc_loot_boxes set version=gen_random_uuid() where id=b.id;
   end if;
  end if;
 else raise exception 'Unknown reward action.' using errcode='22023';end if;
 perform dcc_private.live_notify(case when p_operation in ('read','read-all') then array[auth.uid()] else users end);
end $$;

create function dcc_private.expire_safe_room_access() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.dungeon_floor is distinct from old.dungeon_floor then
  update public.dcc_safe_room_access set allowed=false,floor=new.dungeon_floor,version=gen_random_uuid() where crawler_id=new.id;
 end if;return null;
end $$;
create trigger dcc_safe_room_floor after update of dungeon_floor on public.dcc_crawlers for each row execute function dcc_private.expire_safe_room_access();
-- The player badge counts their own boxes; the GM badge counts the visible game queue.
alter function public.dcc_hud_snapshot(uuid,integer,bigint) set schema dcc_private;
alter function dcc_private.dcc_hud_snapshot(uuid,integer,bigint) rename to hud_before_rewards;
create function public.dcc_hud_snapshot(p_campaign_id uuid,p_floor integer,p_before bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare snapshot jsonb;
begin
 snapshot:=dcc_private.hud_before_rewards(p_campaign_id,p_floor,p_before);
 return snapshot||jsonb_build_object('unopenedBoxes',(select count(*) from public.dcc_loot_boxes b join public.dcc_crawlers c on c.id=b.crawler_id
  where c.campaign_id=p_campaign_id and b.opened_at is null and dcc_private.can_read_rewards(c.id)));
end $$;
revoke all on function dcc_private.hud_before_rewards(uuid,integer,bigint) from public,anon,authenticated;
revoke all on function public.dcc_hud_snapshot(uuid,integer,bigint) from public,anon,authenticated;
grant execute on function public.dcc_hud_snapshot(uuid,integer,bigint) to authenticated;
revoke all on function dcc_private.reward_box_json(public.dcc_loot_boxes),dcc_private.reward_achievement_json(public.dcc_achievements),dcc_private.expire_safe_room_access() from public,anon,authenticated;
revoke all on function public.dcc_safe_room_action(uuid,text,jsonb),public.dcc_safe_room_snapshot(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.dcc_safe_room_action(uuid,text,jsonb),public.dcc_safe_room_snapshot(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
