begin;
-- Delivery state is private crawler data and follows its existing owner/GM RLS.
-- Existing 015/018/019 grants and saved identities are deliberately untouched.
alter table public.dcc_crawlers add column selection_menus jsonb not null default '{"deliveries":[]}'::jsonb
 check(jsonb_typeof(selection_menus)='object' and jsonb_typeof(selection_menus->'deliveries')='array');

create function public.dcc_selection_menu_action(p_campaign_id uuid,p_operation text,p_payload jsonb default '{}')returns jsonb
language plpgsql security definer set search_path=''as $$
declare r public.dcc_crawlers%rowtype; gm boolean; f integer; state jsonb; deliveries jsonb; delivery jsonb; old_delivery jsonb; options jsonb; choice jsonb; item jsonb; pushed integer:=0; skipped integer:=0;
begin
 if auth.uid()is null or not dcc_private.is_member(p_campaign_id)then raise exception 'Game access denied.'using errcode='42501';end if;
 gm:=dcc_private.is_gm(p_campaign_id);
 if p_operation is null or p_operation not in('push','close','draft','choose')or jsonb_typeof(p_payload)is distinct from'object'or octet_length(p_payload::text)>20000 then raise exception 'Invalid menu action.'using errcode='22023';end if;
 if p_operation<>'choose'and not gm then raise exception 'Only the GM can prepare or push menus.'using errcode='42501';end if;
 -- Serialize menu controls without conflicting with crawler/history FK locks.
 perform pg_advisory_xact_lock(hashtextextended(p_campaign_id::text,21));
 if p_operation in('push','close')then
  f:=(p_payload->>'floor')::integer;
  if f is null or f not in(3,6,9,12)then raise exception 'Choose a milestone floor.'using errcode='22023';end if;
  for r in select * from public.dcc_crawlers where campaign_id=p_campaign_id and ruleset='tutorial-v1'and dungeon_floor=f order by id for update loop
   state:=r.selection_menus;
   select value into old_delivery from jsonb_array_elements(state->'deliveries')where(value->>'floor')::integer=f;
   if p_operation='close'then
    if old_delivery->>'status'is distinct from'open'then continue;end if;
    delivery:=jsonb_set(old_delivery,'{status}','"closed"');
   else
    if old_delivery->>'status'='completed'or r.advancement->>'reconciled'is distinct from'true'
      or(f=3 and(r.third_floor->'selected'<>'null'::jsonb or r.third_floor->>'reviewed'is distinct from'true'))
      or(f>3 and(r.third_floor->'selected'='null'::jsonb or coalesce(jsonb_array_length(old_delivery->'options'),0)=0))then skipped:=skipped+1;continue;end if;
    delivery:=jsonb_build_object('id',gen_random_uuid(),'floor',f,'status','open','catalog',f=3 and jsonb_array_length(r.progression->'offers')=0 and jsonb_array_length(r.third_floor->'offers')=0,'options',case when f=3 then'[]'::jsonb else old_delivery->'options'end,'choice',null,'sentAt',now(),'completedAt',null);
   end if;
   select coalesce(jsonb_agg(value),'[]')into deliveries from jsonb_array_elements(state->'deliveries')where(value->>'floor')::integer<>f;
   state:=jsonb_build_object('deliveries',deliveries||jsonb_build_array(delivery));
   update public.dcc_crawlers set selection_menus=state,version=gen_random_uuid()where id=r.id;
   insert into public.dcc_advancement_history(campaign_id,crawler_id,actor_user_id,operation,summary,reason,details)
    values(r.campaign_id,r.id,auth.uid(),'selection-offer',case when p_operation='push'then'GM pushed selection menu'else'GM withdrew selection menu'end,'GM milestone menu control',jsonb_build_object('floor',f,'deliveryId',delivery->'id'));
   pushed:=pushed+1;
  end loop;
  return jsonb_build_object('pushed',pushed,'skipped',skipped);
 end if;
 select * into r from public.dcc_crawlers where id=(p_payload->>'crawlerId')::uuid and campaign_id=p_campaign_id for update;
 if not found or(not gm and r.owner_user_id is distinct from auth.uid())then raise exception 'Crawler access denied.'using errcode='42501';end if;
 if r.version is distinct from(p_payload->>'version')::uuid then raise exception 'Crawler changed.'using errcode='40001';end if;
 f:=r.dungeon_floor;state:=r.selection_menus;
 if r.ruleset<>'tutorial-v1'or f not in(6,9,12)or r.third_floor->'selected'='null'::jsonb then raise exception 'Specializations need a saved Class on a milestone floor.'using errcode='22023';end if;
 select value into old_delivery from jsonb_array_elements(state->'deliveries')where(value->>'floor')::integer=f;
 if old_delivery->>'status'='completed'then raise exception 'This milestone is already complete.'using errcode='22023';end if;
 if p_operation='draft'then
  if(p_payload->>'floor')::integer is distinct from f or jsonb_typeof(p_payload->'options')is distinct from'array'or jsonb_array_length(p_payload->'options')not between 1 and 3 then raise exception 'Enter one to three choices for the current floor.'using errcode='22023';end if;
  options:='[]';
  for item in select value from jsonb_array_elements(p_payload->'options')loop
   if jsonb_typeof(item->'name')is distinct from'string'or length(btrim(item->>'name'))not between 1 and 100 or jsonb_typeof(item->'benefits')is distinct from'string'or length(btrim(item->>'benefits'))not between 1 and 2000 then raise exception 'Review each specialization name and its benefits.'using errcode='22023';end if;
   options:=options||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'name',btrim(item->>'name'),'benefits',btrim(item->>'benefits')));
  end loop;
  delivery:=jsonb_build_object('id',gen_random_uuid(),'floor',f,'status','draft','options',options,'choice',null,'sentAt',null,'completedAt',null);
 else
  if old_delivery->>'status'is distinct from'open'or old_delivery->>'id'is distinct from p_payload->>'deliveryId'or p_payload->'confirmed'is distinct from'true'::jsonb then raise exception 'Choose a current pushed menu.'using errcode='22023';end if;
  select value into choice from jsonb_array_elements(old_delivery->'options')where value->>'id'=p_payload->>'choiceId';
  if choice is null then raise exception 'Choose a current specialization.'using errcode='22023';end if;
  delivery:=old_delivery||jsonb_build_object('status','completed','choice',choice,'completedAt',now());
 end if;
 select coalesce(jsonb_agg(value),'[]')into deliveries from jsonb_array_elements(state->'deliveries')where(value->>'floor')::integer<>f;
 update public.dcc_crawlers set selection_menus=jsonb_build_object('deliveries',deliveries||jsonb_build_array(delivery)),version=gen_random_uuid()where id=r.id;
 insert into public.dcc_advancement_history(campaign_id,crawler_id,actor_user_id,operation,summary,reason,details)
 values(r.campaign_id,r.id,auth.uid(),'selection-review',case when p_operation='draft'then'GM prepared specialization choices'else'Crawler chose specialization'end,'GM-authored specialization; listed benefits are applied through existing GM controls.',jsonb_build_object('floor',f,'menu',delivery));
 return'{}';
end $$;

-- Check under the same crawler row lock as the original checked selection RPC.
create function dcc_private.require_selection_delivery(p_crawler_id uuid,p_expected_version uuid)returns void language plpgsql security definer set search_path=''as $$
declare r public.dcc_crawlers%rowtype;
begin
 select * into r from public.dcc_crawlers where id=p_crawler_id for update;
 if not found or not dcc_private.is_member(r.campaign_id)or(r.owner_user_id is distinct from auth.uid()and not dcc_private.is_gm(r.campaign_id))then raise exception 'Crawler access denied.'using errcode='42501';end if;
 if r.version is distinct from p_expected_version then raise exception 'Crawler changed.'using errcode='40001';end if;
 if not dcc_private.is_gm(r.campaign_id)and(r.dungeon_floor<>3 or not exists(select 1 from jsonb_array_elements(r.selection_menus->'deliveries')d where d->>'floor'='3'and d->>'status'='open'))then raise exception 'Wait for the GM to push the Floor 3 menu.'using errcode='22023';end if;
end $$;
alter function public.dcc_progression_action(uuid,uuid,text,jsonb)set schema dcc_private;
alter function dcc_private.dcc_progression_action(uuid,uuid,text,jsonb)rename to progression_019;
create function public.dcc_progression_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_payload jsonb default '{}')returns void language plpgsql security definer set search_path=''as $$
declare r public.dcc_crawlers%rowtype; ident uuid; current_version uuid;
begin
 if p_operation in('select','catalog-select')then perform dcc_private.require_selection_delivery(p_crawler_id,p_expected_version);end if;
 if p_operation='catalog-select'then
  select * into r from public.dcc_crawlers where id=p_crawler_id for update;
  if r.dungeon_floor<>3 or jsonb_array_length(r.progression->'offers')<>0 or jsonb_array_length(r.third_floor->'offers')<>0 or not exists(select 1 from jsonb_array_elements(r.selection_menus->'deliveries')d where d->>'floor'='3'and d->>'status'='open'and d->>'catalog'='true')then raise exception 'The GM must open the reviewed catalog.'using errcode='22023';end if;
  ident:=gen_random_uuid();
  update public.dcc_crawlers set progression=jsonb_set(progression,'{offers}',jsonb_build_array(jsonb_build_object('id',ident,'raceId',p_payload->>'raceId','classId',p_payload->>'classId','waivers','[]'::jsonb,'reason','GM-pushed reviewed catalog'))),version=gen_random_uuid()where id=r.id returning version into current_version;
  perform dcc_private.progression_019(p_crawler_id,current_version,'select',p_payload||jsonb_build_object('offerId',ident));
 else
  perform dcc_private.progression_019(p_crawler_id,p_expected_version,p_operation,p_payload);
 end if;
end $$;
alter function public.dcc_third_floor_action(uuid,uuid,text,jsonb)set schema dcc_private;
alter function dcc_private.dcc_third_floor_action(uuid,uuid,text,jsonb)rename to third_floor_019;
create function public.dcc_third_floor_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_payload jsonb default '{}')returns void language plpgsql security definer set search_path=''as $$
begin
 if p_operation='select'then perform dcc_private.require_selection_delivery(p_crawler_id,p_expected_version);end if;
 perform dcc_private.third_floor_019(p_crawler_id,p_expected_version,p_operation,p_payload);
end $$;
create function dcc_private.update_selection_delivery()returns trigger language plpgsql security definer set search_path=''as $$
declare menus jsonb:='[]';d jsonb;
begin
 for d in select value from jsonb_array_elements(new.selection_menus->'deliveries')loop
  if d->>'status'='open'then
   if d->>'floor'='3'and old.third_floor->'selected'='null'::jsonb and new.third_floor->'selected'<>'null'::jsonb then d:=d||jsonb_build_object('status','completed','completedAt',now());
   elsif old.dungeon_floor<>new.dungeon_floor then d:=jsonb_set(d,'{status}','"closed"');end if;
  end if;
  menus:=menus||jsonb_build_array(d);
 end loop;
 new.selection_menus:=jsonb_build_object('deliveries',menus);return new;
end $$;
create trigger dcc_zz_selection_delivery before update on public.dcc_crawlers for each row execute function dcc_private.update_selection_delivery();
revoke all on function dcc_private.require_selection_delivery(uuid,uuid),dcc_private.progression_019(uuid,uuid,text,jsonb),dcc_private.third_floor_019(uuid,uuid,text,jsonb),dcc_private.update_selection_delivery()from public,anon,authenticated;
revoke all on function public.dcc_selection_menu_action(uuid,text,jsonb),public.dcc_progression_action(uuid,uuid,text,jsonb),public.dcc_third_floor_action(uuid,uuid,text,jsonb)from public,anon,authenticated;
grant execute on function public.dcc_selection_menu_action(uuid,text,jsonb),public.dcc_progression_action(uuid,uuid,text,jsonb),public.dcc_third_floor_action(uuid,uuid,text,jsonb)to authenticated;

alter table public.dcc_ai_generations drop constraint dcc_ai_generations_purpose_check;
alter table public.dcc_ai_generations add constraint dcc_ai_generations_purpose_check check(purpose in('class-suggestions','selection-suggestions','custom-build'));
create or replace function public.dcc_ai_reserve(p_crawler_id uuid,p_expected_version uuid,p_purpose text,p_fingerprint text,p_model text)returns jsonb
language plpgsql security definer set search_path=''as $$
declare r public.dcc_crawlers%rowtype;cached public.dcc_ai_generations%rowtype;ident uuid;
begin
 if auth.uid()is null then raise exception 'Sign in first.'using errcode='42501';end if;
 select * into r from public.dcc_crawlers where id=p_crawler_id;
 if not found or not dcc_private.is_member(r.campaign_id)or(r.owner_user_id is distinct from auth.uid()and not dcc_private.is_gm(r.campaign_id))then raise exception 'Crawler access denied.'using errcode='42501';end if;
 if r.version is distinct from p_expected_version then raise exception 'Crawler changed.'using errcode='40001';end if;
 if p_purpose is null or p_purpose not in('class-suggestions','selection-suggestions','custom-build')or p_fingerprint is null or p_fingerprint!~'^[a-f0-9]{64}$'or p_model is null or length(p_model)not between 1 and 120 or r.dungeon_floor<3 or r.advancement->>'reconciled'<>'true'then raise exception 'Invalid System AI request.'using errcode='22023';end if;
 perform pg_advisory_xact_lock(2039015020);
 select * into cached from public.dcc_ai_generations where actor_user_id=auth.uid()and crawler_id=r.id and fingerprint=p_fingerprint and model=p_model and purpose=p_purpose and status='succeeded'and created_at>now()-interval'10 minutes'order by created_at desc limit 1;
 if found then return jsonb_build_object('id',cached.id,'cached',cached.response);end if;
 if exists(select 1 from public.dcc_ai_generations where actor_user_id=auth.uid()and created_at>now()-interval'15 seconds')
 or(select count(*)from public.dcc_ai_generations where created_at>now()-interval'1 minute')>=8
 or(select count(*)from public.dcc_ai_generations where created_at>now()-interval'1 day')>=200
 or(select coalesce(sum(case when status='pending'then 5000 else tokens end),0)from public.dcc_ai_generations where created_at>now()-interval'1 minute')>=20000
 then raise exception 'System AI request budget busy.'using errcode='P0001';end if;
 insert into public.dcc_ai_generations(campaign_id,crawler_id,actor_user_id,purpose,fingerprint,model)values(r.campaign_id,r.id,auth.uid(),p_purpose,p_fingerprint,p_model)returning id into ident;
 return jsonb_build_object('id',ident,'cached',null);
end $$;
notify pgrst,'reload schema';
commit;
