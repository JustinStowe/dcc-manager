begin;
alter table public.dcc_crawlers add column effect_links jsonb not null default '{}'::jsonb;
create table public.dcc_effect_templates(id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.dcc_campaigns(id) on delete cascade,definition jsonb not null,repeat_policy text not null check(repeat_policy in ('refresh','replace','add')),version uuid not null default gen_random_uuid());
create index dcc_template_campaign on public.dcc_effect_templates(campaign_id);
alter table public.dcc_effect_templates enable row level security;
revoke all on public.dcc_effect_templates from public,anon,authenticated;
grant select on public.dcc_effect_templates to authenticated;
create policy dcc_template_read on public.dcc_effect_templates for select to authenticated using(dcc_private.is_member(campaign_id) and (dcc_private.is_gm(campaign_id) or exists(select 1 from public.dcc_crawlers c,lateral jsonb_each_text(c.effect_links) l where c.campaign_id=dcc_effect_templates.campaign_id and c.owner_user_id=auth.uid() and l.value=dcc_effect_templates.id::text)));
create function dcc_private.template_definition(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare value jsonb;
begin
 if jsonb_typeof(p) is distinct from 'object' then raise exception 'Invalid template definition.' using errcode='22023';end if;
 value:=jsonb_build_object('id','template','name',p->'name','kind',p->'kind','source',p->'source','notes',p->'notes','active',true,'remainingRounds',p->'remainingRounds','modifiers',p->'modifiers','defenses',p->'defenses');
 value:=(dcc_private.normalize_tracked_effects(jsonb_build_array(value)))->0;
 return value-'id'-'active';
end $$;
create function dcc_private.validate_template() returns trigger language plpgsql security definer set search_path='' as $$ begin new.definition:=dcc_private.template_definition(new.definition);return new;end $$;
create trigger dcc_template_validate before insert or update on public.dcc_effect_templates for each row execute function dcc_private.validate_template();
create function dcc_private.clean_effect_links() returns trigger language plpgsql security definer set search_path='' as $$
declare pair record;kind text;target text;valid boolean;result jsonb:='{}';
begin
 if jsonb_typeof(new.effect_links) is distinct from 'object' then raise exception 'Invalid effect links.' using errcode='22023';end if;
 for pair in select key,value from jsonb_each(new.effect_links) loop
  if pair.key !~ '^(spell|item):[a-z0-9][a-z0-9-]{0,79}$' or jsonb_typeof(pair.value) is distinct from 'string' or (pair.value#>>'{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Invalid effect link.' using errcode='22023';end if;
  kind:=split_part(pair.key,':',1);target:=split_part(pair.key,':',2);
  if kind='spell' then select exists(select 1 from jsonb_array_elements(new.learned_skills) e where e->>'id'=target and e->>'kind'='spell' and e->>'automation'='manual') into valid;
  else select exists(select 1 from jsonb_array_elements(new.inventory) e where e->>'id'=target and e->>'kind'='consumable' and coalesce(e->>'effect','manual')='manual') into valid;end if;
  if not valid then continue;end if;
  if not exists(select 1 from public.dcc_effect_templates t where t.id=(pair.value#>>'{}')::uuid and t.campaign_id=new.campaign_id) then raise exception 'Template unavailable in this game.' using errcode='22023';end if;
  result:=jsonb_set(result,array[pair.key],pair.value);
 end loop;new.effect_links:=result;return new;
end $$;
create trigger dcc_u_effect_links before insert or update on public.dcc_crawlers for each row execute function dcc_private.clean_effect_links();
create function public.dcc_template_action(p_campaign_id uuid,p_operation text,p_template_id uuid default null,p_template_version uuid default null,p_crawler_id uuid default null,p_crawler_version uuid default null,p_kind text default null,p_target text default null,p_definition jsonb default null,p_policy text default null,p_confirmed boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare t public.dcc_effect_templates%rowtype;r public.dcc_crawlers%rowtype;target_key text;valid boolean;
begin
 if auth.uid() is null or not dcc_private.is_member(p_campaign_id) or not dcc_private.is_gm(p_campaign_id) then raise exception 'Only the campaign GM manages templates and links.' using errcode='42501';end if;
 perform 1 from public.dcc_campaigns where id=p_campaign_id for update;
 if p_operation is null or p_operation not in ('add','edit','remove','link') then raise exception 'Unknown template action.' using errcode='22023';end if;
 if p_operation='link' then
  select * into r from public.dcc_crawlers where id=p_crawler_id and campaign_id=p_campaign_id for update;
  if not found or r.ruleset<>'tutorial-v1' then raise exception 'Crawler unavailable.' using errcode='22023';end if;
  if r.version is distinct from p_crawler_version then raise exception 'Crawler changed; refresh.' using errcode='40001';end if;
  if p_kind is null or p_kind not in ('spell','item') or p_target is null then raise exception 'Choose a supported link target.' using errcode='22023';end if;
  if p_kind='spell' then select exists(select 1 from jsonb_array_elements(r.learned_skills) e where e->>'id'=p_target and e->>'kind'='spell' and e->>'automation'='manual') into valid;
  else select exists(select 1 from jsonb_array_elements(r.inventory) e where e->>'id'=p_target and e->>'kind'='consumable' and coalesce(e->>'effect','manual')='manual') into valid;end if;
  if not valid then raise exception 'Only manual Spells and custom consumables can be linked.' using errcode='22023';end if;
  if p_template_id is not null and not exists(select 1 from public.dcc_effect_templates where id=p_template_id and campaign_id=p_campaign_id) then raise exception 'Template unavailable.' using errcode='22023';end if;
  target_key:=p_kind||':'||p_target;
  update public.dcc_crawlers set effect_links=case when p_template_id is null then effect_links-target_key else jsonb_set(effect_links,array[target_key],to_jsonb(p_template_id::text)) end,version=gen_random_uuid() where id=r.id;return;
 end if;
 if p_operation='add' then
  if (select count(*) from public.dcc_effect_templates where campaign_id=p_campaign_id)>=100 then raise exception 'Template limit reached.' using errcode='22023';end if;
  insert into public.dcc_effect_templates(campaign_id,definition,repeat_policy) values(p_campaign_id,dcc_private.template_definition(p_definition),p_policy);return;
 end if;
 select * into t from public.dcc_effect_templates where id=p_template_id and campaign_id=p_campaign_id for update;
 if not found then raise exception 'Template unavailable.' using errcode='22023';end if;
 if t.version is distinct from p_template_version then raise exception 'Template changed; reopen the dialog.' using errcode='40001';end if;
 if p_operation='remove' then if p_confirmed is distinct from true then raise exception 'Confirm template removal.' using errcode='22023';end if;delete from public.dcc_effect_templates where id=t.id;
 else update public.dcc_effect_templates set definition=dcc_private.template_definition(p_definition),repeat_policy=p_policy,version=gen_random_uuid() where id=t.id;end if;
end $$;
create function dcc_private.template_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare template_id uuid;game uuid;gm uuid;
begin
 if tg_op='DELETE' then template_id:=old.id;game:=old.campaign_id;else template_id:=new.id;game:=new.campaign_id;end if;
 if tg_op<>'INSERT' and exists(select 1 from public.dcc_campaigns where id=game) then
  update public.dcc_crawlers c set effect_links=case when tg_op='DELETE' then coalesce((select jsonb_object_agg(key,value) from jsonb_each(c.effect_links) where value<>to_jsonb(template_id::text)),'{}') else effect_links end,version=gen_random_uuid() where campaign_id=game and exists(select 1 from jsonb_each_text(c.effect_links) l where l.value=template_id::text);
 end if;
 select gm_user_id into gm from public.dcc_campaigns where id=game;perform dcc_private.live_notify(array[gm]);return null;
end $$;
create trigger dcc_template_changed after insert or update or delete on public.dcc_effect_templates for each row execute function dcc_private.template_changed();
create function dcc_private.linked_template(r public.dcc_crawlers,target_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.dcc_effect_templates%rowtype;linked text;
begin
 linked:=r.effect_links->>target_key;if linked is null then return null;end if;
 select * into t from public.dcc_effect_templates where id=linked::uuid and campaign_id=r.campaign_id;
 if not found then raise exception 'Linked template unavailable; no resource spent.' using errcode='22023';end if;
 return jsonb_build_object('id',t.id,'version',t.version,'definition',t.definition,'policy',t.repeat_policy);
end $$;
create function dcc_private.apply_linked_template(crawler uuid,snapshot jsonb,source_name text) returns void language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype;e jsonb;result jsonb:='[]';new_id text:=gen_random_uuid()::text;first_id text;
begin
 if snapshot is null then return;end if;select * into r from public.dcc_crawlers where id=crawler for update;
 for e in select value from jsonb_array_elements(r.tracked_effects) loop
  if e->>'templateId'=snapshot->>'id' then
   if first_id is null then first_id:=e->>'id';end if;
   if snapshot->>'policy'<>'add' then continue;end if;
  end if;result:=result||jsonb_build_array(e);
 end loop;
 if snapshot->>'policy'='refresh' and first_id is not null then new_id:=first_id;end if;
 e:=(snapshot->'definition')||jsonb_build_object('id',new_id,'active',true,'templateId',snapshot->'id','templateVersion',snapshot->'version');
 if e->>'source'='' then e:=jsonb_set(e,'{source}',to_jsonb(left(source_name,200)));end if;
 result:=dcc_private.normalize_tracked_effects(result||jsonb_build_array(e));
 update public.dcc_crawlers set tracked_effects=result,version=gen_random_uuid() where id=r.id;
end $$;
create function dcc_private.validate_effect_origin() returns trigger language plpgsql security definer set search_path='' as $$
declare e jsonb;k text;
begin
 for e in select value from jsonb_array_elements(new.tracked_effects) loop
  if e ? 'templateId' or e ? 'templateVersion' then
   foreach k in array array['templateId','templateVersion'] loop
    if jsonb_typeof(e->k) is distinct from 'string' or e->>k !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Invalid effect provenance.' using errcode='22023';end if;
   end loop;
  end if;
 end loop;return new;
end $$;
create trigger dcc_ua_effect_origin before insert or update on public.dcc_crawlers for each row execute function dcc_private.validate_effect_origin();
revoke all on function dcc_private.validate_effect_origin() from public,anon,authenticated;
-- Preserve the installed resource-action bodies behind private wrappers.
alter function public.dcc_skill_action(uuid,uuid,text,text,jsonb,boolean,boolean,text,integer,integer) set schema dcc_private;
alter function dcc_private.dcc_skill_action(uuid,uuid,text,text,jsonb,boolean,boolean,text,integer,integer) rename to skill_before_templates;
alter function public.dcc_inventory_action(uuid,uuid,text,uuid,jsonb,text) set schema dcc_private;
alter function dcc_private.dcc_inventory_action(uuid,uuid,text,uuid,jsonb,text) rename to inventory_before_templates;
create function public.dcc_skill_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_skill_id text default null,p_definition jsonb default null,p_marked boolean default null,p_confirmed boolean default false,p_window text default null,p_die integer default null,p_modifier integer default 0) returns void language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype;snapshot jsonb;source_name text;
begin
 if p_operation='cast' then
  select * into r from public.dcc_crawlers where id=p_crawler_id for update;
  if not found or auth.uid() is null or not dcc_private.is_member(r.campaign_id) or (r.owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(r.campaign_id)) then raise exception 'Ability access denied.' using errcode='42501';end if;
  snapshot:=dcc_private.linked_template(r,'spell:'||p_skill_id);select e->>'name' into source_name from jsonb_array_elements(r.learned_skills) e where e->>'id'=p_skill_id;
 end if;
 perform dcc_private.skill_before_templates(p_crawler_id,p_expected_version,p_operation,p_skill_id,p_definition,p_marked,p_confirmed,p_window,p_die,p_modifier);
 if p_operation='cast' then perform dcc_private.apply_linked_template(p_crawler_id,snapshot,'Spell: '||source_name);end if;
end $$;
create function public.dcc_inventory_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_item_id uuid default null,p_item jsonb default null,p_location text default null) returns void language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype;snapshot jsonb;source_name text;
begin
 if p_operation='consume' then
  select * into r from public.dcc_crawlers where id=p_crawler_id for update;
  if not found or auth.uid() is null or not dcc_private.is_member(r.campaign_id) or (r.owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(r.campaign_id)) then raise exception 'Inventory access denied.' using errcode='42501';end if;
  snapshot:=dcc_private.linked_template(r,'item:'||p_item_id::text);select e->>'name' into source_name from jsonb_array_elements(r.inventory) e where e->>'id'=p_item_id::text;
  if snapshot is not null and r.current_segments=0 then raise exception 'A Dying crawler cannot use a linked consumable.' using errcode='22023';end if;
 end if;
 perform dcc_private.inventory_before_templates(p_crawler_id,p_expected_version,p_operation,p_item_id,p_item,p_location);
 if p_operation='consume' then perform dcc_private.apply_linked_template(p_crawler_id,snapshot,'Consumable: '||source_name);end if;
end $$;
-- Recompile the installed Hotlist dispatcher so pooled sessions resolve the new wrappers.
-- Preserve its installed body, including any prior bug fixes.
do $$ declare definition text;begin
 select pg_get_functiondef('public.dcc_loadout_action(uuid,uuid,text,integer,text,text,text,jsonb,jsonb,bigint)'::regprocedure) into definition;
 execute definition;
end $$;
create or replace function public.dcc_effect_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_payload jsonb default '{}') returns void
language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype;e jsonb;target jsonb;proposed jsonb;result jsonb:='[]';rounds integer;matched boolean:=false;
begin
 if auth.uid() is null then raise exception 'Sign in first.' using errcode='42501';end if;
 select * into r from public.dcc_crawlers where id=p_crawler_id for update;
 if not found or not dcc_private.is_member(r.campaign_id) or not dcc_private.is_gm(r.campaign_id) then raise exception 'Only the campaign GM manages effects.' using errcode='42501';end if;
 if r.ruleset<>'tutorial-v1' then raise exception 'Official crawler required.' using errcode='22023';end if;
 if r.version is distinct from p_expected_version then raise exception 'Crawler changed; refresh.' using errcode='40001';end if;
 if p_operation is null or p_operation not in ('add','edit','toggle','remove','tick') or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid effect action.' using errcode='22023';end if;
 if p_operation in ('add','edit') then
  proposed:=p_payload->'definition';if jsonb_typeof(proposed) is distinct from 'object' then raise exception 'Invalid effect definition.' using errcode='22023';end if;
  proposed:=jsonb_build_object('id',case when p_operation='add' then gen_random_uuid()::text else p_payload->>'id' end,'name',proposed->'name','kind',proposed->'kind','source',proposed->'source','notes',proposed->'notes','active',proposed->'active','remainingRounds',proposed->'remainingRounds','modifiers',proposed->'modifiers','defenses',proposed->'defenses');
  if p_operation='edit' then
   select value into target from jsonb_array_elements(r.tracked_effects) where value->>'id'=p_payload->>'id';
   if target ? 'templateId' then proposed:=proposed||jsonb_build_object('templateId',target->'templateId','templateVersion',target->'templateVersion');end if;
  end if;
 end if;
 for e in select value from jsonb_array_elements(r.tracked_effects) loop
  if p_operation='tick' and e->>'active'='true' and e->'remainingRounds'<>'null'::jsonb then
   rounds:=dcc_private.tutorial_int(e->'remainingRounds',1,10000)-1;e:=e||jsonb_build_object('remainingRounds',rounds,'active',rounds>0);
  elsif e->>'id'=p_payload->>'id' then
   matched:=true;
   if p_operation='remove' then continue;
   elsif p_operation='toggle' then
    if jsonb_typeof(p_payload->'active') is distinct from 'boolean' then raise exception 'Choose active or inactive.' using errcode='22023';end if;e:=jsonb_set(e,'{active}',p_payload->'active');
   elsif p_operation='edit' then e:=proposed;end if;
  end if;
  result:=result||jsonb_build_array(e);
 end loop;
 if p_operation='add' then result:=result||jsonb_build_array(proposed);
 elsif p_operation<>'tick' and not matched then raise exception 'Effect unavailable.' using errcode='22023';end if;
 result:=dcc_private.normalize_tracked_effects(result);
 update public.dcc_crawlers set tracked_effects=result,version=gen_random_uuid() where id=r.id;
end $$;
revoke all on function dcc_private.template_definition(jsonb),dcc_private.validate_template(),dcc_private.clean_effect_links(),dcc_private.template_changed(),dcc_private.linked_template(public.dcc_crawlers,text),dcc_private.apply_linked_template(uuid,jsonb,text),dcc_private.skill_before_templates(uuid,uuid,text,text,jsonb,boolean,boolean,text,integer,integer),dcc_private.inventory_before_templates(uuid,uuid,text,uuid,jsonb,text) from public,anon,authenticated;
revoke all on function public.dcc_template_action(uuid,text,uuid,uuid,uuid,uuid,text,text,jsonb,text,boolean),public.dcc_skill_action(uuid,uuid,text,text,jsonb,boolean,boolean,text,integer,integer),public.dcc_inventory_action(uuid,uuid,text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.dcc_template_action(uuid,text,uuid,uuid,uuid,uuid,text,text,jsonb,text,boolean),public.dcc_skill_action(uuid,uuid,text,text,jsonb,boolean,boolean,text,integer,integer),public.dcc_inventory_action(uuid,uuid,text,uuid,jsonb,text) to authenticated;
notify pgrst,'reload schema';
commit;
