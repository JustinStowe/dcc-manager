begin;
alter table public.dcc_crawlers
 add column crawler_level integer not null default 1 check(crawler_level between 1 and 1000),
 add column dungeon_floor integer not null default 1 check(dungeon_floor between 1 and 18),
 add column stat_effects jsonb not null default '[]'::jsonb;
-- Preserve existing non-gear differences as an explicit active source.
update public.dcc_crawlers c set stat_effects=jsonb_build_array(jsonb_build_object('id','legacy-adjustment','name','Imported non-gear adjustment','active',true,'modifiers',(select jsonb_object_agg(key,to_jsonb((value->>'enhanced')::integer-(value->>'base')::integer)) from jsonb_each(c.stat_baseline)))) where ruleset='tutorial-v1' and exists(select 1 from jsonb_each(c.stat_baseline) where (value->>'enhanced')::integer<>(value->>'base')::integer);
create function dcc_private.sheet_baseline(baseline jsonb,effects jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e jsonb;k text;result jsonb:='{}';ids text[]:=array[]::text[];base integer;delta bigint;n integer;
begin
 if jsonb_typeof(baseline) is distinct from 'object' or jsonb_typeof(effects) is distinct from 'array' then raise exception 'Invalid stat sources.' using errcode='22023';end if;
 if jsonb_array_length(effects)>100 then raise exception 'Too many stat modifiers.' using errcode='22023';end if;
 for e in select value from jsonb_array_elements(effects) loop
  if jsonb_typeof(e) is distinct from 'object' or jsonb_typeof(e->'id') is distinct from 'string' or e->>'id' !~ '^[a-z0-9-]{1,80}$' or e->>'id'=any(ids) or jsonb_typeof(e->'name') is distinct from 'string' or length(btrim(e->>'name')) not between 1 and 120 or jsonb_typeof(e->'active') is distinct from 'boolean' or jsonb_typeof(e->'modifiers') is distinct from 'object' then raise exception 'Invalid stat modifier.' using errcode='22023';end if;
  select count(*) into n from jsonb_object_keys(e->'modifiers');if n<>5 then raise exception 'Expected five modifier fields.' using errcode='22023';end if;
  ids:=array_append(ids,e->>'id');
  foreach k in array array['strength','intelligence','constitution','dexterity','charisma'] loop perform dcc_private.tutorial_int(e#>array['modifiers',k],-10000,10000);end loop;
 end loop;
 foreach k in array array['strength','intelligence','constitution','dexterity','charisma'] loop
  base:=dcc_private.tutorial_int(baseline#>array[k,'base'],1,10000);
  select coalesce(sum((value#>>array['modifiers',k])::bigint),0) into delta from jsonb_array_elements(effects) where value->>'active'='true';
  result:=jsonb_set(result,array[k],jsonb_build_object('base',base,'enhanced',greatest(1,least(10000,base+delta))));
 end loop;
 return result;
end $$;
create or replace function dcc_private.recalculate_loadout() returns trigger
language plpgsql security definer set search_path='' as $$
declare totals jsonb; potion_id text;
begin
 if new.ruleset<>'tutorial-v1' then return new; end if;
 if new.learned_skills is null then new.learned_skills:=dcc_private.seed_abilities(new.tutorial_profile);end if;
 perform dcc_private.validate_abilities(new.learned_skills);
 if tg_op='INSERT' then
  if new.stat_baseline is null then new.stat_baseline:=new.tutorial_profile->'stats';end if;
 elsif old.ruleset<>'tutorial-v1' or new.stat_baseline is null then
  new.stat_baseline:=new.tutorial_profile->'stats';
 end if;
 if tg_op='INSERT' then
  new.hotlist:='[{"kind":"skill","target":"heal"},null,null,null,null,null,null,null,null,null]'::jsonb;
  if exists(select 1 from dcc_private.tutorial_catalog,lateral jsonb_array_elements(data->'combat') option_row where option_row->>'id'=new.tutorial_profile->>'combatId' and option_row->>'kind'='spell') then
   new.hotlist:=jsonb_set(new.hotlist,'{1}',jsonb_build_object('kind','skill','target',new.tutorial_profile->>'combatId'));
   select value->>'id' into potion_id from jsonb_array_elements(new.inventory) where value->>'effect'='mana-full' limit 1;
   if potion_id is not null then new.hotlist:=jsonb_set(new.hotlist,'{2}',jsonb_build_object('kind','item','target',potion_id));end if;
  end if;
 end if;
 new.stat_baseline:=dcc_private.sheet_baseline(new.stat_baseline,new.stat_effects);
 perform dcc_private.validate_inventory(new.inventory);
 totals:=dcc_private.loadout_totals(new.stat_baseline,new.inventory,new.defense_base);
 new.tutorial_profile:=jsonb_set(new.tutorial_profile,'{stats}',totals->'stats');
 new.tutorial_profile:=jsonb_set(new.tutorial_profile,'{mana}',to_jsonb(least((new.tutorial_profile->>'mana')::integer,(totals#>>'{stats,intelligence,enhanced}')::integer)));
 perform dcc_private.validate_tutorial(new.tutorial_profile,false);
 new.constitution:=(totals#>>'{stats,constitution,enhanced}')::integer;
 new.hotlist:=dcc_private.clean_hotlist(new.hotlist,new.inventory,new.tutorial_profile,new.learned_skills);
 return new;
end $$;

create function public.dcc_sheet_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_payload jsonb default '{}') returns void
language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype;p jsonb;baseline jsonb;effects jsonb;entry jsonb;part record;k text;v_amount integer;net bigint:=0;dr integer;slots integer;v_level integer;v_floor integer;v_number integer;v_name text;found_effect boolean:=false;
begin
 if auth.uid() is null then raise exception 'Sign in first.' using errcode='42501';end if;
 select * into r from public.dcc_crawlers where id=p_crawler_id for update;
 if not found or not dcc_private.is_member(r.campaign_id) or (r.owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(r.campaign_id)) then raise exception 'Sheet access denied.' using errcode='42501';end if;
 if r.ruleset<>'tutorial-v1' then raise exception 'Official crawler required.' using errcode='22023';end if;
 if r.version is distinct from p_expected_version then raise exception 'Crawler changed; refresh.' using errcode='40001';end if;
 if p_operation is null or p_operation not in ('damage','healing','mana','favor-use','favor-award','name','number','level','floor','base-stats','effect-add','effect-toggle','effect-remove','defense') or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid sheet action.' using errcode='22023';end if;
 if p_operation in ('number','level','floor','base-stats','effect-add','effect-toggle','effect-remove','defense','favor-award') and not dcc_private.is_gm(r.campaign_id) then raise exception 'Only the GM can make this change.' using errcode='42501';end if;
 p:=r.tutorial_profile;baseline:=r.stat_baseline;effects:=r.stat_effects;slots:=r.current_segments;v_level:=r.crawler_level;v_floor:=r.dungeon_floor;v_number:=r.crawler_number;v_name:=r.name;dr:=r.defense_base;
 case p_operation
 when 'damage' then
  if jsonb_typeof(p_payload->'parts') is distinct from 'array' then raise exception 'Enter damage components.' using errcode='22023';end if;
  if jsonb_array_length(p_payload->'parts') not between 1 and 30 then raise exception 'Enter 1 to 30 damage components.' using errcode='22023';end if;
  for entry in select value from jsonb_array_elements(p_payload->'parts') loop
   if jsonb_typeof(entry) is distinct from 'object' or jsonb_typeof(entry->'type') is distinct from 'string' or entry->>'type' not in ('Acid','Bludgeoning','Electric','Fire','Force','Holy','Ice','Necrotic','Piercing','Poison','Psychic','Slashing','Sonic','Armor Piercing') then raise exception 'Choose a ruleset damage type.' using errcode='22023';end if;
   perform dcc_private.tutorial_int(entry->'amount',1,1000000000);
  end loop;
  dr:=(dcc_private.loadout_totals(baseline,r.inventory,r.defense_base)->>'dr')::integer;
  for part in select item->>'type' as kind,sum((item->>'amount')::bigint) as amount from jsonb_array_elements(p_payload->'parts') item group by item->>'type' loop
   net:=net+greatest(0,part.amount-case when part.kind='Armor Piercing' then 0 else dr end);
  end loop;
  slots:=greatest(0,slots-least(10,net/dcc_private.tutorial_modifier((p#>>'{stats,constitution,enhanced}')::integer))::integer);dr:=r.defense_base;
 when 'healing' then v_amount:=dcc_private.tutorial_int(p_payload->'amount',1,10);slots:=least(10,slots+v_amount);
 when 'mana' then v_amount:=dcc_private.tutorial_int(p_payload->'value',0,(p#>>'{stats,intelligence,enhanced}')::integer);p:=jsonb_set(p,'{mana}',to_jsonb(v_amount));
 when 'favor-use' then v_amount:=(p->>'favor')::integer;if v_amount<1 then raise exception 'No AI Favor available.' using errcode='22023';end if;p:=jsonb_set(p,'{favor}',to_jsonb(v_amount-1));
 when 'favor-award' then v_amount:=dcc_private.tutorial_int(p_payload->'amount',1,2147483647);if (p->>'favor')::bigint+v_amount>2147483647 then raise exception 'Favor exceeds supported range.' using errcode='22023';end if;p:=jsonb_set(p,'{favor}',to_jsonb((p->>'favor')::integer+v_amount));
 when 'name' then
  if dcc_private.is_gm(r.campaign_id) or r.owner_user_id is distinct from auth.uid() then raise exception 'Only the owning player can rename their crawler.' using errcode='42501';end if;
  if jsonb_typeof(p_payload->'value') is distinct from 'string' or length(btrim(p_payload->>'value')) not between 1 and 200 then raise exception 'Enter a name of 1 to 200 characters.' using errcode='22023';end if;v_name:=btrim(p_payload->>'value');
 when 'number' then v_number:=dcc_private.tutorial_int(p_payload->'value',1,2147483647);
 when 'level' then v_level:=dcc_private.tutorial_int(p_payload->'value',1,1000);
 when 'floor' then v_floor:=dcc_private.tutorial_int(p_payload->'value',1,18);
 when 'defense' then dr:=dcc_private.tutorial_int(p_payload->'value',0,10000);
 when 'base-stats' then
  foreach k in array array['strength','intelligence','constitution','dexterity','charisma'] loop v_amount:=dcc_private.tutorial_int(p_payload#>array['bases',k],1,10000);baseline:=jsonb_set(baseline,array[k,'base'],to_jsonb(v_amount));end loop;
 when 'effect-add' then
  effects:=effects||jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'name',p_payload->'name','active',p_payload->'active','modifiers',p_payload->'modifiers'));
 when 'effect-toggle','effect-remove' then
  effects:='[]';
  for entry in select value from jsonb_array_elements(r.stat_effects) loop
   if entry->>'id'=p_payload->>'id' then
    found_effect:=true;if p_operation='effect-remove' then continue;end if;
    if jsonb_typeof(p_payload->'active') is distinct from 'boolean' then raise exception 'Choose active or inactive.' using errcode='22023';end if;entry:=jsonb_set(entry,'{active}',p_payload->'active');
   end if;
   effects:=effects||jsonb_build_array(entry);
  end loop;
  if not found_effect then raise exception 'Modifier unavailable.' using errcode='22023';end if;
 end case;
 baseline:=dcc_private.sheet_baseline(baseline,effects);
 update public.dcc_crawlers set name=v_name,crawler_number=v_number,crawler_level=v_level,dungeon_floor=v_floor,stat_effects=effects,stat_baseline=baseline,defense_base=dr,current_segments=slots,tutorial_profile=p,version=gen_random_uuid() where id=r.id;
end $$;
create or replace function dcc_private.tutorial_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_amount bigint default 0,p_stats jsonb default null,p_number integer default null)
returns void language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype; p jsonb; slots integer; mana integer; favor bigint; threshold integer;
begin
 select * into r from public.dcc_crawlers where id=p_crawler_id for update;
 if not found or not dcc_private.is_member(r.campaign_id) or (r.owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(r.campaign_id)) then raise exception 'Not permitted.' using errcode='42501'; end if;
 if r.ruleset<>'tutorial-v1' then raise exception 'GM conversion required.' using errcode='22023'; end if;
 if r.version is distinct from p_expected_version then raise exception 'Crawler changed; refresh.' using errcode='40001'; end if;
 p:=r.tutorial_profile; slots:=r.current_segments; mana:=(p->>'mana')::integer; favor:=(p->>'favor')::bigint;
 if p_amount is null or p_amount<0 or p_amount>9007199254740991 then raise exception 'Invalid amount.' using errcode='22023'; end if;
 case p_operation
 when 'damage' then threshold:=dcc_private.tutorial_modifier((p#>>'{stats,constitution,enhanced}')::integer); slots:=greatest(0,slots-least(10,p_amount/threshold)::integer);
 when 'heal-slots' then slots:=least(10::bigint,slots::bigint+p_amount)::integer;
 when 'cast-heal' then
  if slots=0 or mana<2 then raise exception 'Cannot cast Heal while Dying or without 2 Mana.' using errcode='22023'; end if;
  slots:=least(10,slots+2);mana:=mana-2;
 when 'mana-spend' then
  if p_amount>mana then raise exception 'Insufficient Mana.' using errcode='22023'; end if;mana:=mana-p_amount::integer;
 when 'mana-recover' then mana:=least((p#>>'{stats,intelligence,enhanced}')::bigint,mana::bigint+p_amount)::integer;
 when 'favor-spend' then
  if favor<1 then raise exception 'No AI Favor available.' using errcode='22023'; end if;favor:=favor-1;
 when 'favor-award' then
  if not dcc_private.is_gm(r.campaign_id) then raise exception 'Only the GM awards Favor.' using errcode='42501'; end if;
  favor:=favor+p_amount;if favor>2147483647 then raise exception 'Counter exceeds supported range.' using errcode='22023'; end if;
 when 'stats' then
  if jsonb_typeof(p_stats) is distinct from 'object' then raise exception 'Invalid base stats.' using errcode='22023';end if;
  perform public.dcc_sheet_action(r.id,r.version,'base-stats',jsonb_build_object('bases',(select jsonb_object_agg(key,value->'base') from jsonb_each(p_stats))));return;
 when 'number' then
  if not dcc_private.is_gm(r.campaign_id) then raise exception 'Only the GM edits Crawler Numbers.' using errcode='42501'; end if;
  if p_number is null or p_number<1 then raise exception 'Use a positive number.' using errcode='22023'; end if;
 else raise exception 'Unknown tutorial action.' using errcode='22023';
 end case;
 p:=jsonb_set(jsonb_set(p,'{mana}',to_jsonb(mana)),'{favor}',to_jsonb(favor));
 perform dcc_private.validate_tutorial(p,false);
 update public.dcc_crawlers set stat_baseline=case when p_operation='stats' then p_stats else r.stat_baseline end,current_segments=slots,tutorial_profile=p,constitution=(p#>>'{stats,constitution,enhanced}')::integer,crawler_number=case when p_operation='number' then p_number else crawler_number end,version=gen_random_uuid() where id=r.id;
end $$;
update public.dcc_crawlers set version=gen_random_uuid() where ruleset='tutorial-v1';
revoke all on function dcc_private.sheet_baseline(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.dcc_sheet_action(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dcc_sheet_action(uuid,uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
