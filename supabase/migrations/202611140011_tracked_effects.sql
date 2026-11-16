begin;
alter table public.dcc_crawlers add column tracked_effects jsonb not null default '[]'::jsonb,add column base_typed_defenses jsonb not null default '{}'::jsonb;
-- Preserve previously reviewed sources and persistent defenses before installing projection.
update public.dcc_crawlers c set base_typed_defenses=typed_defenses,tracked_effects=coalesce((select jsonb_agg(value||jsonb_build_object('kind','condition','source','Imported stat modifier','notes','','remainingRounds',null,'defenses','{}'::jsonb)) from jsonb_array_elements(c.stat_effects)),'[]'::jsonb) where ruleset='tutorial-v1';
create function dcc_private.normalize_tracked_effects(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e jsonb;result jsonb:='[]';rounds integer;k text;
begin
 if jsonb_typeof(p) is distinct from 'array' then raise exception 'Invalid effects.' using errcode='22023';end if;
 if jsonb_array_length(p)>100 then raise exception 'Too many effects.' using errcode='22023';end if;
 for e in select value from jsonb_array_elements(p) loop
  if jsonb_typeof(e) is distinct from 'object' or jsonb_typeof(e->'kind') is distinct from 'string' or e->>'kind' not in ('buff','debuff','condition') then raise exception 'Invalid effect kind.' using errcode='22023';end if;
  foreach k in array array['source','notes'] loop if jsonb_typeof(e->k) is distinct from 'string' then raise exception 'Invalid effect text.' using errcode='22023';end if;end loop;
  if length(e->>'source')>200 or length(e->>'notes')>2000 then raise exception 'Effect text too long.' using errcode='22023';end if;
  if e->'remainingRounds' is distinct from 'null'::jsonb then rounds:=dcc_private.tutorial_int(e->'remainingRounds',0,10000);else rounds:=null;end if;
  if rounds=0 and e->>'active'='true' then raise exception 'Expired effects must be inactive.' using errcode='22023';end if;
  e:=e||jsonb_build_object('source',btrim(e->>'source'),'notes',btrim(e->>'notes'),'defenses',dcc_private.normalize_typed_defenses(e->'defenses'));
  result:=result||jsonb_build_array(e);
 end loop;
 -- Existing validation enforces identity, booleans, all five signed stats and unique IDs.
 perform dcc_private.sheet_baseline('{"strength":{"base":1},"intelligence":{"base":1},"constitution":{"base":1},"dexterity":{"base":1},"charisma":{"base":1}}'::jsonb,result);
 return result;
end $$;
create function dcc_private.project_tracked_effects() returns trigger
language plpgsql security definer set search_path='' as $$
declare e jsonb;pair record;flags jsonb;combined jsonb;
begin
 new.tracked_effects:=dcc_private.normalize_tracked_effects(new.tracked_effects);
 new.base_typed_defenses:=dcc_private.normalize_typed_defenses(new.base_typed_defenses);combined:=new.base_typed_defenses;new.stat_effects:='[]';
 for e in select value from jsonb_array_elements(new.tracked_effects) loop
  new.stat_effects:=new.stat_effects||jsonb_build_array(jsonb_build_object('id',e->'id','name',e->'name','active',e->'active','modifiers',e->'modifiers'));
  if e->>'active'='true' then
   for pair in select key,value from jsonb_each(e->'defenses') loop
    flags:=coalesce(combined->pair.key,'{}'::jsonb);
    combined:=jsonb_set(combined,array[pair.key],jsonb_build_object('resistant',coalesce((flags->>'resistant')::boolean,false) or (pair.value->>'resistant')::boolean,'vulnerable',coalesce((flags->>'vulnerable')::boolean,false) or (pair.value->>'vulnerable')::boolean,'immune',coalesce((flags->>'immune')::boolean,false) or (pair.value->>'immune')::boolean));
   end loop;
  end if;
 end loop;
 new.typed_defenses:=dcc_private.normalize_typed_defenses(combined);return new;
end $$;
-- Runs before dcc_validate_typed_defenses and dcc_zz_recalculate_loadout.
create trigger dcc_v_project_effects before insert or update on public.dcc_crawlers for each row execute function dcc_private.project_tracked_effects();
create function public.dcc_effect_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_payload jsonb default '{}') returns void
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
create or replace function public.dcc_sheet_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_payload jsonb default '{}') returns void
language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype;p jsonb;baseline jsonb;effects jsonb;entry jsonb;part record;k text;v_amount integer;net bigint:=0;dr integer;slots integer;v_level integer;v_floor integer;v_number integer;v_name text;found_effect boolean:=false;v_defenses jsonb;portion_net bigint;v_base_defenses jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first.' using errcode='42501';end if;
 select * into r from public.dcc_crawlers where id=p_crawler_id for update;
 if not found or not dcc_private.is_member(r.campaign_id) or (r.owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(r.campaign_id)) then raise exception 'Sheet access denied.' using errcode='42501';end if;
 if r.ruleset<>'tutorial-v1' then raise exception 'Official crawler required.' using errcode='22023';end if;
 if r.version is distinct from p_expected_version then raise exception 'Crawler changed; refresh.' using errcode='40001';end if;
 if p_operation is null or p_operation not in ('damage','healing','mana','favor-use','favor-award','name','number','level','floor','base-stats','effect-add','effect-toggle','effect-remove','defense','typed-defenses') or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid sheet action.' using errcode='22023';end if;
 if p_operation in ('number','level','floor','base-stats','effect-add','effect-toggle','effect-remove','defense','favor-award','typed-defenses') and not dcc_private.is_gm(r.campaign_id) then raise exception 'Only the GM can make this change.' using errcode='42501';end if;
 if p_operation='effect-add' then
  perform public.dcc_effect_action(r.id,r.version,'add',jsonb_build_object('definition',p_payload||jsonb_build_object('kind','condition','source','Legacy stat modifier','notes','','remainingRounds',null,'defenses','{}'::jsonb)));return;
 elsif p_operation in ('effect-toggle','effect-remove') then
  perform public.dcc_effect_action(r.id,r.version,case when p_operation='effect-toggle' then 'toggle' else 'remove' end,p_payload);return;
 end if;
 v_base_defenses:=r.base_typed_defenses;
 v_defenses:=dcc_private.normalize_typed_defenses(r.typed_defenses);p:=r.tutorial_profile;baseline:=r.stat_baseline;effects:=r.stat_effects;slots:=r.current_segments;v_level:=r.crawler_level;v_floor:=r.dungeon_floor;v_number:=r.crawler_number;v_name:=r.name;dr:=r.defense_base;
 case p_operation
 when 'typed-defenses' then v_base_defenses:=dcc_private.normalize_typed_defenses(p_payload->'defenses');
 when 'damage' then
  if jsonb_typeof(p_payload->'parts') is distinct from 'array' then raise exception 'Enter damage components.' using errcode='22023';end if;
  if jsonb_array_length(p_payload->'parts') not between 1 and 30 then raise exception 'Enter 1 to 30 damage components.' using errcode='22023';end if;
  for entry in select value from jsonb_array_elements(p_payload->'parts') loop
   if jsonb_typeof(entry) is distinct from 'object' or jsonb_typeof(entry->'type') is distinct from 'string' or entry->>'type' not in ('Acid','Bludgeoning','Electric','Fire','Force','Holy','Ice','Necrotic','Piercing','Poison','Psychic','Slashing','Sonic','Armor Piercing') then raise exception 'Choose a ruleset damage type.' using errcode='22023';end if;
   perform dcc_private.tutorial_int(entry->'amount',1,1000000000);
  end loop;
  dr:=(dcc_private.loadout_totals(baseline,r.inventory,r.defense_base)->>'dr')::integer;
  for part in select item->>'type' as kind,sum((item->>'amount')::bigint) as amount from jsonb_array_elements(p_payload->'parts') item group by item->>'type' loop
   portion_net:=greatest(0,part.amount-case when part.kind='Armor Piercing' then 0 else dr end);
   if part.kind<>'Armor Piercing' then
    if coalesce((v_defenses#>>array[part.kind,'resistant'])::boolean,false) then portion_net:=portion_net/2;end if;
    if coalesce((v_defenses#>>array[part.kind,'vulnerable'])::boolean,false) then portion_net:=portion_net*2;end if;
    if coalesce((v_defenses#>>array[part.kind,'immune'])::boolean,false) then portion_net:=0;end if;
   end if;
   net:=net+portion_net;
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
 update public.dcc_crawlers set base_typed_defenses=v_base_defenses,typed_defenses=v_defenses,name=v_name,crawler_number=v_number,crawler_level=v_level,dungeon_floor=v_floor,stat_effects=effects,stat_baseline=baseline,defense_base=dr,current_segments=slots,tutorial_profile=p,version=gen_random_uuid() where id=r.id;
end $$;
update public.dcc_crawlers set version=gen_random_uuid() where ruleset='tutorial-v1';
revoke all on function dcc_private.normalize_tracked_effects(jsonb),dcc_private.project_tracked_effects() from public,anon,authenticated;
revoke all on function public.dcc_effect_action(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dcc_effect_action(uuid,uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
