begin;
alter table public.dcc_crawlers add column typed_defenses jsonb not null default '{}'::jsonb;
create function dcc_private.normalize_typed_defenses(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare kind text;flags jsonb;result jsonb:='{}';n integer;
begin
 if jsonb_typeof(p) is distinct from 'object' then raise exception 'Invalid typed defenses.' using errcode='22023';end if;
 for kind,flags in select key,value from jsonb_each(p) loop
  if kind not in ('Acid','Bludgeoning','Electric','Fire','Force','Holy','Ice','Necrotic','Piercing','Poison','Psychic','Slashing','Sonic') or jsonb_typeof(flags) is distinct from 'object' then raise exception 'Choose a ruleset defense type.' using errcode='22023';end if;
  select count(*) into n from jsonb_object_keys(flags);
  if n<>3 or jsonb_typeof(flags->'resistant') is distinct from 'boolean' or jsonb_typeof(flags->'vulnerable') is distinct from 'boolean' or jsonb_typeof(flags->'immune') is distinct from 'boolean' then raise exception 'Invalid defense flags.' using errcode='22023';end if;
  if (flags->>'resistant')::boolean or (flags->>'vulnerable')::boolean or (flags->>'immune')::boolean then result:=jsonb_set(result,array[kind],flags);end if;
 end loop;
 return result;
end $$;
create function dcc_private.validate_typed_defenses() returns trigger
language plpgsql security definer set search_path='' as $$
begin new.typed_defenses:=dcc_private.normalize_typed_defenses(new.typed_defenses);return new;end $$;
create trigger dcc_validate_typed_defenses before insert or update on public.dcc_crawlers for each row execute function dcc_private.validate_typed_defenses();
create or replace function public.dcc_sheet_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_payload jsonb default '{}') returns void
language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype;p jsonb;baseline jsonb;effects jsonb;entry jsonb;part record;k text;v_amount integer;net bigint:=0;dr integer;slots integer;v_level integer;v_floor integer;v_number integer;v_name text;found_effect boolean:=false;v_defenses jsonb;portion_net bigint;
begin
 if auth.uid() is null then raise exception 'Sign in first.' using errcode='42501';end if;
 select * into r from public.dcc_crawlers where id=p_crawler_id for update;
 if not found or not dcc_private.is_member(r.campaign_id) or (r.owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(r.campaign_id)) then raise exception 'Sheet access denied.' using errcode='42501';end if;
 if r.ruleset<>'tutorial-v1' then raise exception 'Official crawler required.' using errcode='22023';end if;
 if r.version is distinct from p_expected_version then raise exception 'Crawler changed; refresh.' using errcode='40001';end if;
 if p_operation is null or p_operation not in ('damage','healing','mana','favor-use','favor-award','name','number','level','floor','base-stats','effect-add','effect-toggle','effect-remove','defense','typed-defenses') or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid sheet action.' using errcode='22023';end if;
 if p_operation in ('number','level','floor','base-stats','effect-add','effect-toggle','effect-remove','defense','favor-award','typed-defenses') and not dcc_private.is_gm(r.campaign_id) then raise exception 'Only the GM can make this change.' using errcode='42501';end if;
 v_defenses:=dcc_private.normalize_typed_defenses(r.typed_defenses);p:=r.tutorial_profile;baseline:=r.stat_baseline;effects:=r.stat_effects;slots:=r.current_segments;v_level:=r.crawler_level;v_floor:=r.dungeon_floor;v_number:=r.crawler_number;v_name:=r.name;dr:=r.defense_base;
 case p_operation
 when 'typed-defenses' then v_defenses:=dcc_private.normalize_typed_defenses(p_payload->'defenses');
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
 update public.dcc_crawlers set typed_defenses=v_defenses,name=v_name,crawler_number=v_number,crawler_level=v_level,dungeon_floor=v_floor,stat_effects=effects,stat_baseline=baseline,defense_base=dr,current_segments=slots,tutorial_profile=p,version=gen_random_uuid() where id=r.id;
end $$;
-- New defenses are neutral. Never infer them from names, notes, or gear.
update public.dcc_crawlers set version=gen_random_uuid() where ruleset='tutorial-v1';
revoke all on function dcc_private.normalize_typed_defenses(jsonb),dcc_private.validate_typed_defenses() from public,anon,authenticated;
revoke all on function public.dcc_sheet_action(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dcc_sheet_action(uuid,uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
