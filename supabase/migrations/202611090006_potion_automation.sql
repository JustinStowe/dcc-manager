begin;

-- Extends migration 005 without renaming or guessing the effect of existing items.
-- Missing effect stays manual; only explicitly identified Mana potions automate.

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
    -- Only supported fields are accepted; client-supplied IDs/locations cannot grant equipment.
    replacement:=jsonb_build_object('id',case when p_operation='add' then gen_random_uuid() else p_item_id end,
      'name',btrim(p_item->>'name'),'kind',p_item->'kind','quantity',dcc_private.tutorial_int(p_item->'quantity',1,999999),'notes',btrim(p_item->>'notes'),
      'gearSlot',p_item->'gearSlot','effect',coalesce(p_item->>'effect','manual'),'location',case when p_operation='add' then 'stored' else target->>'location' end);
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

create or replace function dcc_private.seed_tutorial_inventory() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.ruleset='tutorial-v1' and exists(select 1 from dcc_private.tutorial_catalog,
    lateral jsonb_array_elements(data->'combat') option_row
    where option_row->>'id'=new.tutorial_profile->>'combatId' and option_row->>'kind'='spell') then
    new.inventory:=new.inventory||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),
      'name','Standard Mana Potion','kind','consumable','effect','mana-full','quantity',5,'gearSlot','none','location','stored',
      'notes','Starting spellcaster allowance. Restores all Mana; confirm potion timing at the table.'));
  end if;
  perform dcc_private.validate_inventory(new.inventory);
  return new;
end;
$$;
revoke all on function dcc_private.validate_inventory(jsonb),dcc_private.seed_tutorial_inventory() from public,anon,authenticated;
revoke all on function public.dcc_inventory_action(uuid,uuid,text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.dcc_inventory_action(uuid,uuid,text,uuid,jsonb,text) to authenticated;
notify pgrst,'reload schema';
commit;
