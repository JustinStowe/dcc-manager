begin;
alter table public.dcc_crawlers add column stat_baseline jsonb;
alter table public.dcc_crawlers add column defense_base integer not null default 0 check (defense_base between 0 and 10000);
alter table public.dcc_crawlers add column hotlist jsonb not null default '[null,null,null,null,null,null,null,null,null,null]'::jsonb;
update public.dcc_crawlers set stat_baseline=tutorial_profile->'stats' where ruleset='tutorial-v1';
alter table public.dcc_crawlers add constraint dcc_hotlist_length check (case when jsonb_typeof(hotlist)='array' then jsonb_array_length(hotlist)=10 else false end);
-- Existing Enhanced values are preserved as the reviewed baseline. Existing gear
-- has no numeric definitions until its GM explicitly configures and reviews them.
create function dcc_private.validate_gear_bonuses(p jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare k text;
begin
 if jsonb_typeof(p) is distinct from 'object' then raise exception 'Invalid bonuses.' using errcode='22023'; end if;
 if (select count(*) from jsonb_object_keys(p))<>7 then raise exception 'Expected seven bonus fields.' using errcode='22023'; end if;
 foreach k in array array['strength','intelligence','constitution','dexterity','charisma','dr','evade'] loop
  perform dcc_private.tutorial_int(p->k,0,1000);
 end loop;
end $$;
create function dcc_private.loadout_totals(p_base jsonb,p_items jsonb,p_dr integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare k text; item jsonb; n integer; enhanced integer; stats jsonb:='{}'; gear jsonb:='{"strength":0,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0,"dr":0,"evade":0}';
begin
 if p_dr is null or p_dr not between 0 and 10000 or jsonb_typeof(p_base) is distinct from 'object' then raise exception 'Invalid baseline.' using errcode='22023'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if item ? 'bonuses' then
   perform dcc_private.validate_gear_bonuses(item->'bonuses');
   if item->>'location'<>'stored' then
    foreach k in array array['strength','intelligence','constitution','dexterity','charisma','dr','evade'] loop
     gear:=jsonb_set(gear,array[k],to_jsonb((gear->>k)::integer+dcc_private.tutorial_int(item#>array['bonuses',k],0,1000)));
    end loop;
   end if;
  end if;
 end loop;
 foreach k in array array['strength','intelligence','constitution','dexterity','charisma'] loop
  n:=dcc_private.tutorial_int(p_base#>array[k,'base'],1,10000);
  enhanced:=dcc_private.tutorial_int(p_base#>array[k,'enhanced'],1,10000)+(gear->>k)::integer;
  if enhanced>10000 then raise exception 'Enhanced score exceeds supported storage.' using errcode='22023'; end if;
  stats:=stats||jsonb_build_object(k,jsonb_build_object('base',n,'enhanced',enhanced));
 end loop;
 return jsonb_build_object('stats',stats,'gear',gear,'dr',p_dr+(gear->>'dr')::integer,'evade',dcc_private.tutorial_modifier((stats#>>'{dexterity,enhanced}')::integer)+(gear->>'evade')::integer);
end $$;
create function dcc_private.clean_hotlist(p jsonb,items jsonb,profile jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare entry jsonb; result jsonb:='[]'; seen text[]:=array[]::text[]; key text;
begin
 if jsonb_typeof(p) is distinct from 'array' then raise exception 'Invalid Hotlist.' using errcode='22023'; end if;
 if jsonb_array_length(p)<>10 then raise exception 'Hotlist must have ten slots.' using errcode='22023'; end if;
 for entry in select value from jsonb_array_elements(p) loop
  if entry='null'::jsonb then result:=result||'[null]'::jsonb;continue;end if;
  if jsonb_typeof(entry) is distinct from 'object' or jsonb_typeof(entry->'kind') is distinct from 'string' or entry->>'kind' not in ('item','skill') or jsonb_typeof(entry->'target') is distinct from 'string' then raise exception 'Invalid Hotlist reference.' using errcode='22023';end if;
  if entry->>'kind'='item' and not exists(select 1 from jsonb_array_elements(items) where value->>'id'=entry->>'target') then result:=result||'[null]'::jsonb;continue;end if;
  if entry->>'kind'='skill' and entry->>'target'<>'heal' and not exists(select 1 from dcc_private.tutorial_catalog,lateral jsonb_array_elements(data->'combat') option_row where option_row->>'id'=profile->>'combatId' and option_row->>'kind'='spell' and option_row->>'id'=entry->>'target') then raise exception 'Unknown Hotlist Spell.' using errcode='22023';end if;
  key:=(entry->>'kind')||':'||(entry->>'target');
  if key=any(seen) then raise exception 'A stack or Spell uses one Hotlist slot.' using errcode='22023';end if;
  seen:=array_append(seen,key);result:=result||jsonb_build_array(entry);
 end loop;
 return result;
end $$;
create or replace function dcc_private.validate_inventory(p_items jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare item jsonb; item_id uuid; ids uuid[] := array[]::uuid[]; occupied text[] := array[]::text[];
  gear text; location text; needed text; accessories integer := 0; quantity integer;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Invalid inventory.' using errcode='22023'; end if;
  if jsonb_array_length(p_items)>200 then raise exception 'Inventory supports up to 200 entries.' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'id') is distinct from 'string' or
      (item->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid item ID.' using errcode='22023';
    end if;
    item_id := (item->>'id')::uuid;
    if item_id=any(ids) then raise exception 'Duplicate item ID.' using errcode='22023'; end if;
    ids := array_append(ids,item_id);
    if jsonb_typeof(item->'name') is distinct from 'string' or length(item->>'name')>120 or length(btrim(item->>'name'))=0 or
       jsonb_typeof(item->'notes') is distinct from 'string' or length(item->>'notes')>2000 then
      raise exception 'Invalid item text.' using errcode='22023';
    end if;
    if jsonb_typeof(item->'kind') is distinct from 'string' or item->>'kind' not in ('weapon','armor','consumable','gear','quest','misc') then
      raise exception 'Invalid item type.' using errcode='22023';
    end if;
    quantity := dcc_private.tutorial_int(item->'quantity',1,999999);
    if item ? 'bonuses' then
      perform dcc_private.validate_gear_bonuses(item->'bonuses');
      if item->>'gearSlot'='none' and exists(select 1 from jsonb_each_text(item->'bonuses') where value::numeric<>0) then raise exception 'Bonuses require equippable gear.' using errcode='22023'; end if;
    end if;
    if item ? 'effect' and (jsonb_typeof(item->'effect') is distinct from 'string' or item->>'effect' not in ('manual','mana-full')) then
      raise exception 'Invalid item effect.' using errcode='22023';
    end if;
    if coalesce(item->>'effect','manual')='mana-full' and item->>'kind'<>'consumable' then
      raise exception 'Mana potion effect requires a consumable.' using errcode='22023';
    end if;
    gear := item->>'gearSlot'; location := item->>'location';
    if jsonb_typeof(item->'gearSlot') is distinct from 'string' or gear not in ('none','head','torso','arms','legs','feet','hands','holding','two-hands','accessory','belt','cape') or
       jsonb_typeof(item->'location') is distinct from 'string' or location not in ('stored','head','torso','arms','legs','feet','hands','main-hand','off-hand','two-hands','accessory','belt','cape') then
      raise exception 'Invalid gear slot.' using errcode='22023';
    end if;
    if location='stored' then continue; end if;
    if not ((gear='holding' and location in ('main-hand','off-hand')) or (gear<>'none' and gear=location)) then
      raise exception 'Item cannot use that slot.' using errcode='22023';
    end if;
    if location in ('accessory','belt','cape') then
      accessories := accessories+1;
      if accessories>10 then raise exception 'Only ten accessories may be equipped.' using errcode='22023'; end if;
      if location='accessory' then continue; end if;
    end if;
    foreach needed in array case when location='two-hands' then array['main-hand','off-hand'] else array[location] end loop
      if needed=any(occupied) then raise exception 'Equipment slot occupied.' using errcode='22023'; end if;
      occupied:=array_append(occupied,needed);
    end loop;
  end loop;
end;
$$;

create or replace function public.dcc_inventory_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,
  p_item_id uuid default null,p_item jsonb default null,p_location text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare crawler public.dcc_crawlers%rowtype; items jsonb; changed jsonb := '[]'::jsonb; item jsonb;
  replacement jsonb; target jsonb; quantity integer; profile jsonb; mana integer; maximum integer;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode='42501'; end if;
  select * into crawler from public.dcc_crawlers where id=p_crawler_id for update;
  if not found or not dcc_private.is_member(crawler.campaign_id) or
    (crawler.owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(crawler.campaign_id)) then
    raise exception 'Inventory access denied.' using errcode='42501';
  end if;
  if crawler.ruleset<>'tutorial-v1' then raise exception 'Convert the prototype first.' using errcode='22023'; end if;
  if crawler.version is distinct from p_expected_version then raise exception 'Crawler changed; refresh.' using errcode='40001'; end if;
  if p_operation is null or p_operation not in ('add','edit','equip','consume','remove','drink-mana','classify') then raise exception 'Invalid inventory action.' using errcode='22023'; end if;
  items:=crawler.inventory; profile:=crawler.tutorial_profile;
  perform dcc_private.validate_inventory(items);
  if p_operation<>'add' then
    select value into target from jsonb_array_elements(items) where (value->>'id')::uuid=p_item_id;
    if target is null then raise exception 'Item not found.' using errcode='22023'; end if;
  end if;
  if p_operation in ('add','edit') then
    if jsonb_typeof(p_item) is distinct from 'object' then raise exception 'Invalid item.' using errcode='22023'; end if;
    if jsonb_typeof(p_item->'name') is distinct from 'string' or length(p_item->>'name')>120 or
       jsonb_typeof(p_item->'notes') is distinct from 'string' or length(p_item->>'notes')>2000 then
      raise exception 'Invalid item text.' using errcode='22023';
    end if;
    if p_item ? 'effect' and jsonb_typeof(p_item->'effect') is distinct from 'string' then
      raise exception 'Invalid item effect.' using errcode='22023';
    end if;
    if p_item ? 'bonuses' then raise exception 'Use the GM gear-bonus operation.' using errcode='42501'; end if;
    -- Existing GM definitions survive ordinary item editing.
    replacement:=jsonb_build_object('id',case when p_operation='add' then gen_random_uuid() else p_item_id end,
      'name',btrim(p_item->>'name'),'kind',p_item->'kind','quantity',dcc_private.tutorial_int(p_item->'quantity',1,999999),'notes',btrim(p_item->>'notes'),
      'gearSlot',p_item->'gearSlot','effect',coalesce(p_item->>'effect','manual'),'location',case when p_operation='add' then 'stored' else target->>'location' end);
    if p_operation='edit' and target ? 'bonuses' then replacement:=replacement||jsonb_build_object('bonuses',target->'bonuses'); end if;
    perform dcc_private.validate_inventory(jsonb_build_array(replacement));
    if p_operation='edit' and (replacement->'kind' is distinct from target->'kind' or replacement->'gearSlot' is distinct from target->'gearSlot' or coalesce(replacement->>'effect','manual') is distinct from coalesce(target->>'effect','manual')) then
      raise exception 'Item type and slot are fixed.' using errcode='22023';
    end if;
  end if;
  if p_operation='classify' then
    if not dcc_private.is_gm(crawler.campaign_id) then raise exception 'Only the GM can reclassify existing effects.' using errcode='42501'; end if;
    if jsonb_typeof(p_item->'effect') is distinct from 'string' or p_item->>'effect' not in ('manual','mana-full') then
      raise exception 'Choose a supported effect.' using errcode='22023';
    end if;
    replacement:=jsonb_set(target,'{effect}',p_item->'effect');
    perform dcc_private.validate_inventory(jsonb_build_array(replacement));
  end if;
  if p_operation='add' then changed:=items||jsonb_build_array(replacement);
  else
    for item in select value from jsonb_array_elements(items) loop
      if item->>'id'<>target->>'id' then changed:=changed||jsonb_build_array(item); continue; end if;
      if p_operation in ('edit','classify') then item:=replacement;
      elsif p_operation='equip' then
        if p_location is null then raise exception 'Choose an equipment location.' using errcode='22023'; end if;
        item:=jsonb_set(item,'{location}',to_jsonb(p_location));
      elsif p_operation in ('consume','drink-mana') then
        if item->>'kind'<>'consumable' then raise exception 'Only consumables can be used.' using errcode='22023'; end if;
        if p_operation='consume' and coalesce(item->>'effect','manual')<>'manual' then
          raise exception 'Use the supported potion action.' using errcode='22023';
        end if;
        if p_operation='drink-mana' then
          if coalesce(item->>'effect','manual')<>'mana-full' then raise exception 'Identify a Standard Mana Potion first.' using errcode='22023'; end if;
          if crawler.current_segments=0 then raise exception 'A Dying crawler cannot drink themselves.' using errcode='22023'; end if;
          mana:=(profile->>'mana')::integer; maximum:=(profile#>>'{stats,intelligence,enhanced}')::integer;
          if mana>=maximum then raise exception 'Mana is already full; no potion spent.' using errcode='22023'; end if;
          profile:=jsonb_set(profile,'{mana}',to_jsonb(maximum));
          perform dcc_private.validate_tutorial(profile,false);
        end if;
        quantity:=dcc_private.tutorial_int(item->'quantity',1,999999);
        if quantity=1 then continue; end if;
        item:=jsonb_set(item,'{quantity}',to_jsonb(quantity-1));
      elsif p_operation='remove' then continue;
      end if;
      changed:=changed||jsonb_build_array(item);
    end loop;
  end if;
  perform dcc_private.validate_inventory(changed);
  -- Shares the crawler version/row lock with health, Mana, stats, and other writes.
  -- Potion quantity and Mana change in the SAME update, or neither changes.
  update public.dcc_crawlers set inventory=changed,tutorial_profile=profile,version=gen_random_uuid() where id=crawler.id;
end;
$$;

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
  if not dcc_private.is_gm(r.campaign_id) then raise exception 'Only the GM edits stats.' using errcode='42501'; end if;
  p:=jsonb_set(p,'{stats}',dcc_private.loadout_totals(p_stats,r.inventory,r.defense_base)->'stats');mana:=least(mana,(p#>>'{stats,intelligence,enhanced}')::integer);
 when 'number' then
  if not dcc_private.is_gm(r.campaign_id) then raise exception 'Only the GM edits Crawler Numbers.' using errcode='42501'; end if;
  if p_number is null or p_number<1 then raise exception 'Use a positive number.' using errcode='22023'; end if;
 else raise exception 'Unknown tutorial action.' using errcode='22023';
 end case;
 p:=jsonb_set(jsonb_set(p,'{mana}',to_jsonb(mana)),'{favor}',to_jsonb(favor));
 perform dcc_private.validate_tutorial(p,false);
 update public.dcc_crawlers set stat_baseline=case when p_operation='stats' then p_stats else r.stat_baseline end,current_segments=slots,tutorial_profile=p,constitution=(p#>>'{stats,constitution,enhanced}')::integer,crawler_number=case when p_operation='number' then p_number else crawler_number end,version=gen_random_uuid() where id=r.id;
end $$;
create function dcc_private.recalculate_loadout() returns trigger
language plpgsql security definer set search_path='' as $$
declare totals jsonb; potion_id text;
begin
 if new.ruleset<>'tutorial-v1' then return new; end if;
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
 perform dcc_private.validate_inventory(new.inventory);
 totals:=dcc_private.loadout_totals(new.stat_baseline,new.inventory,new.defense_base);
 new.tutorial_profile:=jsonb_set(new.tutorial_profile,'{stats}',totals->'stats');
 new.tutorial_profile:=jsonb_set(new.tutorial_profile,'{mana}',to_jsonb(least((new.tutorial_profile->>'mana')::integer,(totals#>>'{stats,intelligence,enhanced}')::integer)));
 perform dcc_private.validate_tutorial(new.tutorial_profile,false);
 new.constitution:=(totals#>>'{stats,constitution,enhanced}')::integer;
 new.hotlist:=dcc_private.clean_hotlist(new.hotlist,new.inventory,new.tutorial_profile);
 return new;
end $$;
-- Alphabetically after dcc_seed_tutorial_inventory, so a new spellcaster's
-- generated potion stack exists before the default Hotlist references it.
create trigger dcc_zz_recalculate_loadout before insert or update on public.dcc_crawlers for each row execute function dcc_private.recalculate_loadout();

create function public.dcc_loadout_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_slot integer default null,p_kind text default null,p_target text default null,p_location text default null,p_bonuses jsonb default null,p_baseline jsonb default null,p_amount bigint default 0)
returns void language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype; entry jsonb; item jsonb; changed jsonb:='[]'; totals jsonb; target_id uuid; wanted text[]; places text[]; list jsonb; i integer; slots integer;
begin
 if auth.uid() is null then raise exception 'Sign in first.' using errcode='42501';end if;
 select * into r from public.dcc_crawlers where id=p_crawler_id for update;
 if not found or not dcc_private.is_member(r.campaign_id) or (r.owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(r.campaign_id)) then raise exception 'Loadout access denied.' using errcode='42501';end if;
 if r.ruleset<>'tutorial-v1' then raise exception 'Convert the prototype first.' using errcode='22023';end if;
 if r.version is distinct from p_expected_version then raise exception 'Crawler changed; refresh.' using errcode='40001';end if;
 if p_operation in ('assign','clear','use','ready') then
  if p_slot is null or p_slot not between 1 and 10 then raise exception 'Choose a Hotlist slot from 1 to 10.' using errcode='22023';end if;
  if r.current_segments=0 then raise exception 'Dying crawlers cannot use their HUD.' using errcode='22023';end if;
  entry:=r.hotlist->(p_slot-1);
 end if;
 case p_operation
 when 'assign' then
  if p_kind is null or p_kind not in ('item','skill') or p_target is null then raise exception 'Choose a target.' using errcode='22023';end if;
  if p_kind='item' and not exists(select 1 from jsonb_array_elements(r.inventory) where value->>'id'=p_target) then raise exception 'Item unavailable.' using errcode='22023';end if;
  entry:=jsonb_build_object('kind',p_kind,'target',p_target);list:=r.hotlist;
  for i in 0..9 loop if list->i=entry then list:=jsonb_set(list,array[i::text],'null');end if;end loop;
  list:=jsonb_set(list,array[(p_slot-1)::text],entry);
  list:=dcc_private.clean_hotlist(list,r.inventory,r.tutorial_profile);
  update public.dcc_crawlers set hotlist=list,version=gen_random_uuid() where id=r.id;
 when 'clear' then update public.dcc_crawlers set hotlist=jsonb_set(hotlist,array[(p_slot-1)::text],'null'),version=gen_random_uuid() where id=r.id;
 when 'use' then
  if entry is null or entry='null'::jsonb then raise exception 'Hotlist slot is empty.' using errcode='22023';end if;
  if r.current_segments=0 then raise exception 'Dying crawlers cannot use their HUD.' using errcode='22023';end if;
  if entry->>'kind'='skill' then
   if entry->>'target'<>'heal' then raise exception 'Resolve this Spell at the table.' using errcode='22023';end if;
   perform public.dcc_tutorial_action(r.id,r.version,'cast-heal');
  else
   select value into item from jsonb_array_elements(r.inventory) where value->>'id'=entry->>'target';
   if item is null or item->>'kind'<>'consumable' then raise exception 'Use ready for held gear; other effects remain manual.' using errcode='22023';end if;
   perform public.dcc_inventory_action(r.id,r.version,case when item->>'effect'='mana-full' then 'drink-mana' else 'consume' end,(item->>'id')::uuid);
  end if;
 when 'ready' then
  if entry->>'kind' is distinct from 'item' then raise exception 'Choose a prepared held item.' using errcode='22023';end if;
  if r.current_segments=0 then raise exception 'Dying crawlers cannot use their HUD.' using errcode='22023';end if;
  select value into item from jsonb_array_elements(r.inventory) where value->>'id'=entry->>'target';
  if item is null or p_location is null or not ((item->>'gearSlot'='holding' and p_location in ('main-hand','off-hand')) or (item->>'gearSlot'='two-hands' and p_location='two-hands')) then raise exception 'Choose a compatible holding location.' using errcode='22023';end if;
  wanted:=case when p_location='two-hands' then array['main-hand','off-hand'] else array[p_location] end;
  for entry in select value from jsonb_array_elements(r.inventory) loop
   places:=case when entry->>'location'='two-hands' then array['main-hand','off-hand'] else array[entry->>'location'] end;
   if entry->>'id'=item->>'id' then entry:=jsonb_set(entry,'{location}',to_jsonb(p_location));
   elsif places && wanted then entry:=jsonb_set(entry,'{location}','"stored"');end if;
   changed:=changed||jsonb_build_array(entry);
  end loop;
  perform dcc_private.validate_inventory(changed);
  update public.dcc_crawlers set inventory=changed,version=gen_random_uuid() where id=r.id;
 when 'bonuses' then
  if not dcc_private.is_gm(r.campaign_id) then raise exception 'Only the GM defines equipment bonuses.' using errcode='42501';end if;
  perform dcc_private.validate_gear_bonuses(p_bonuses);
  for entry in select value from jsonb_array_elements(r.inventory) loop
   if entry->>'id'=p_target then
    target_id:=(entry->>'id')::uuid;entry:=jsonb_set(entry,'{bonuses}',p_bonuses);
   end if;
   changed:=changed||jsonb_build_array(entry);
  end loop;
  if target_id is null then raise exception 'Item unavailable.' using errcode='22023';end if;
  perform dcc_private.validate_inventory(changed);
  perform dcc_private.loadout_totals(p_baseline,changed,r.defense_base);
  update public.dcc_crawlers set inventory=changed,stat_baseline=p_baseline,version=gen_random_uuid() where id=r.id;
 when 'defense' then
  if not dcc_private.is_gm(r.campaign_id) then raise exception 'Only the GM sets non-gear DR.' using errcode='42501';end if;
  slots:=dcc_private.tutorial_int(to_jsonb(p_amount),0,10000);
  update public.dcc_crawlers set defense_base=slots,version=gen_random_uuid() where id=r.id;
 when 'damage-dr' then
  if p_amount is null or p_amount<1 or p_amount>9007199254740991 then raise exception 'Enter positive raw damage.' using errcode='22023';end if;
  totals:=dcc_private.loadout_totals(r.stat_baseline,r.inventory,r.defense_base);
  slots:=greatest(0,r.current_segments-least(10,greatest(0,p_amount-(totals->>'dr')::integer)/dcc_private.tutorial_modifier((r.tutorial_profile#>>'{stats,constitution,enhanced}')::integer))::integer);
  update public.dcc_crawlers set current_segments=slots,version=gen_random_uuid() where id=r.id;
 else raise exception 'Unknown loadout action.' using errcode='22023';
 end case;
end $$;

revoke all on function dcc_private.validate_gear_bonuses(jsonb),dcc_private.loadout_totals(jsonb,jsonb,integer),dcc_private.clean_hotlist(jsonb,jsonb,jsonb),dcc_private.recalculate_loadout() from public,anon,authenticated;
revoke all on function public.dcc_loadout_action(uuid,uuid,text,integer,text,text,text,jsonb,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.dcc_loadout_action(uuid,uuid,text,integer,text,text,text,jsonb,jsonb,bigint) to authenticated;
notify pgrst,'reload schema';
commit;
