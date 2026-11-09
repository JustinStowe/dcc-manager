begin;
alter table public.dcc_campaigns add column next_crawler_number integer not null default 500000;
alter table public.dcc_crawlers add column ruleset text not null default 'prototype' check (ruleset in ('prototype','tutorial-v1'));
alter table public.dcc_crawlers add column tutorial_profile jsonb;
alter table public.dcc_crawlers add column crawler_number integer check (crawler_number > 0);
alter table public.dcc_crawlers drop column max_segments;
alter table public.dcc_crawlers add column max_segments integer generated always as (
  case when ruleset = 'tutorial-v1' then 10 else greatest(1,base_segments + floor((constitution-10)::numeric/2)::integer) end
) stored;
alter table public.dcc_crawlers add constraint dcc_health_bounds check (current_segments between 0 and max_segments);
alter table public.dcc_crawlers add constraint dcc_tutorial_shape check (
 (ruleset='prototype' and tutorial_profile is null and crawler_number is null) or
 (ruleset='tutorial-v1' and tutorial_profile is not null and crawler_number is not null and base_segments=10 and constitution=(tutorial_profile#>>'{stats,constitution,enhanced}')::integer)
);
alter table public.dcc_crawlers add constraint dcc_crawler_number_unique unique(campaign_id,crawler_number);
create table dcc_private.tutorial_catalog (id boolean primary key default true check(id), data jsonb not null);
insert into dcc_private.tutorial_catalog(data) values ($catalog${"backgrounds":[{"id":"childhood-1","stage":"childhood","name":"Latchkey Kid","rank":1,"skills":[{"name":"Streetwise","stat":"Cha"},{"name":"Perception","stat":"Int"},{"name":"Stealth","stat":"Dex"}]},{"id":"childhood-2","stage":"childhood","name":"Crafty Kid","rank":1,"skills":[{"name":"Fabricate","stat":"Int"},{"name":"Repair","stat":"Int"},{"name":"Salvage","stat":"Int"}]},{"id":"childhood-3","stage":"childhood","name":"Excitable Kid","rank":1,"skills":[{"name":"Escape Artist","stat":"Dex"},{"name":"Endurance","stat":"Con"},{"name":"Running","stat":"Dex"}]},{"id":"childhood-4","stage":"childhood","name":"Gymnast","rank":1,"skills":[{"name":"Endurance","stat":"Con"},{"name":"Jumping","stat":"Str"},{"name":"Performance","stat":"Cha"}]},{"id":"childhood-5","stage":"childhood","name":"Military Brat","rank":1,"skills":[{"name":"Deception","stat":"Cha"},{"name":"Streetwise","stat":"Cha"},{"name":"Tactics","stat":"Int"}]},{"id":"childhood-6","stage":"childhood","name":"MMO Kid","rank":1,"skills":[{"name":"Fabricate","stat":"Int"},{"name":"Engineering","stat":"Int"},{"name":"Tactics","stat":"Int"}]},{"id":"childhood-7","stage":"childhood","name":"Only Child","rank":1,"skills":[{"name":"Good First Impression","stat":"Cha"},{"name":"Investigation","stat":"Int"},{"name":"Negotiation","stat":"Cha"}]},{"id":"childhood-8","stage":"childhood","name":"Outdoor Kid","rank":1,"skills":[{"name":"Animal Handling","stat":"Cha"},{"name":"Climbing","stat":"Str"},{"name":"Swimming","stat":"Str"}]},{"id":"childhood-9","stage":"childhood","name":"Problem Child","rank":1,"skills":[{"name":"Intimidate","stat":"Str"},{"name":"Deception","stat":"Cha"},{"name":"Pugilism","stat":"Dex"}]},{"id":"childhood-10","stage":"childhood","name":"Scamp","rank":1,"skills":[{"name":"Hide in Shadows","stat":"Dex"},{"name":"Jumping","stat":"Str"},{"name":"Throwing","stat":"Str"}]},{"id":"childhood-11","stage":"childhood","name":"Teacher’s Pet","rank":1,"skills":[{"name":"Catcher","stat":null},{"name":"Perception","stat":"Int"},{"name":"Good First Impression","stat":"Cha"}]},{"id":"childhood-12","stage":"childhood","name":"Wild Child","rank":1,"skills":[{"name":"Stealth","stat":"Dex"},{"name":"Survival","stat":"Con"},{"name":"Running","stat":"Dex"}]},{"id":"adolescence-1","stage":"adolescence","name":"Family Farm","rank":1,"skills":[{"name":"Animal Handling","stat":"Cha"},{"name":"Fabricate","stat":"Int"},{"name":"Tracking","stat":"Int"}]},{"id":"adolescence-2","stage":"adolescence","name":"Drama Nerd","rank":1,"skills":[{"name":"Fabricate","stat":"Int"},{"name":"Deception","stat":"Cha"},{"name":"Performance","stat":"Cha"}]},{"id":"adolescence-3","stage":"adolescence","name":"Drop-Out","rank":1,"skills":[{"name":"Chopper Pilot","stat":"Dex"},{"name":"Streetwise","stat":"Cha"},{"name":"Survival","stat":"Con"}]},{"id":"adolescence-4","stage":"adolescence","name":"Greek Life","rank":1,"skills":[{"name":"Negotiation","stat":"Cha"},{"name":"Intimidate","stat":"Str"},{"name":"Taunt","stat":"Cha"}]},{"id":"adolescence-5","stage":"adolescence","name":"Influencer","rank":1,"skills":[{"name":"Negotiation","stat":"Cha"},{"name":"Persuasion","stat":"Cha"},{"name":"Performance","stat":"Cha"}]},{"id":"adolescence-6","stage":"adolescence","name":"Jock","rank":1,"skills":[{"name":"Endurance","stat":"Con"},{"name":"Jumping","stat":"Str"},{"name":"Throwing","stat":"Str"}]},{"id":"adolescence-7","stage":"adolescence","name":"McJob","rank":1,"skills":[{"name":"Determine Value","stat":null},{"name":"Negotiation","stat":"Cha"},{"name":"Repair","stat":"Int"}]},{"id":"adolescence-8","stage":"adolescence","name":"Popular","rank":1,"skills":[{"name":"Good First Impression","stat":"Cha"},{"name":"Perception","stat":"Int"},{"name":"Persuasion","stat":"Cha"}]},{"id":"adolescence-9","stage":"adolescence","name":"Religious","rank":1,"skills":[{"name":"Catcher","stat":null},{"name":"First Aid","stat":"Int"},{"name":"Persuasion","stat":"Cha"}]},{"id":"adolescence-10","stage":"adolescence","name":"Student Government","rank":1,"skills":[{"name":"Deception","stat":"Cha"},{"name":"Persuasion","stat":"Cha"},{"name":"Investigation","stat":"Int"}]},{"id":"adolescence-11","stage":"adolescence","name":"Nerd","rank":1,"skills":[{"name":"Investigation","stat":"Int"},{"name":"Repair","stat":"Int"},{"name":"Fabricate","stat":"Int"}]},{"id":"adolescence-12","stage":"adolescence","name":"Weirdo","rank":1,"skills":[{"name":"Streetwise","stat":"Cha"},{"name":"Intimidate","stat":"Str"},{"name":"Fabricate","stat":"Int"}]},{"id":"career-1","stage":"career","name":"Criminal","rank":3,"skills":[{"name":"Deception","stat":"Cha"},{"name":"Stealth","stat":"Dex"},{"name":"Streetwise","stat":"Cha"}]},{"id":"career-2","stage":"career","name":"Service Industry","rank":3,"skills":[{"name":"Dagger","stat":"Dex"},{"name":"Endurance","stat":"Con"},{"name":"Sleight of Hand","stat":"Dex"}]},{"id":"career-3","stage":"career","name":"Small Business Owner","rank":3,"skills":[{"name":"Determine Value","stat":null},{"name":"Negotiation","stat":"Cha"},{"name":"Perception","stat":"Int"}]},{"id":"career-4","stage":"career","name":"Medical","rank":3,"skills":[{"name":"Sleight of Hand","stat":"Dex"},{"name":"Detect Lies","stat":"Int"},{"name":"First Aid","stat":"Int"}]},{"id":"career-5","stage":"career","name":"Law Enforcement","rank":3,"skills":[{"name":"Detect Lies","stat":"Int"},{"name":"Handgun","stat":"Dex"},{"name":"Investigation","stat":"Int"}]},{"id":"career-6","stage":"career","name":"Gig Worker","rank":3,"skills":[{"name":"Driving","stat":"Dex"},{"name":"Escape Artist","stat":"Str"},{"name":"Negotiation","stat":"Cha"}]},{"id":"career-7","stage":"career","name":"Teacher","rank":3,"skills":[{"name":"Detect Lies","stat":"Int"},{"name":"Perception","stat":"Int"},{"name":"Performance","stat":"Int"}]},{"id":"career-8","stage":"career","name":"Office Drone","rank":3,"skills":[{"name":"Dumpster Diving","stat":"Int"},{"name":"Endurance","stat":"Con"},{"name":"Investigation","stat":"Int"}]},{"id":"career-9","stage":"career","name":"Entertainer","rank":3,"skills":[{"name":"Deception","stat":"Cha"},{"name":"Good First Impression","stat":"Cha"},{"name":"Performance","stat":"Cha"}]},{"id":"career-10","stage":"career","name":"Unhoused","rank":3,"skills":[{"name":"Dumpster Diving","stat":"Int"},{"name":"Streetwise","stat":"Cha"},{"name":"Survival","stat":"Con"}]},{"id":"career-11","stage":"career","name":"Middle Manager","rank":3,"skills":[{"name":"Deception","stat":"Cha"},{"name":"Intimidate","stat":"Str"},{"name":"Negotiation","stat":"Cha"}]},{"id":"career-12","stage":"career","name":"Military","rank":3,"skills":[{"name":"Handgun","stat":"Dex"},{"name":"Survival","stat":"Con"},{"name":"Tactics","stat":"Int"}]},{"id":"hobby-1","stage":"hobby","name":"Collector","rank":2,"skills":[{"name":"Fabricate","stat":"Int"},{"name":"Determine Value","stat":null},{"name":"Investigation","stat":"Int"}]},{"id":"hobby-2","stage":"hobby","name":"Cosplay","rank":2,"skills":[{"name":"Fabricate","stat":"Int"},{"name":"Performance","stat":"Cha"},{"name":"Salvage","stat":"Int"}]},{"id":"hobby-3","stage":"hobby","name":"Drinker","rank":2,"skills":[{"name":"Deception","stat":"Cha"},{"name":"Intimidate","stat":"Str"},{"name":"Streetwise","stat":"Cha"}]},{"id":"hobby-4","stage":"hobby","name":"Gamer","rank":2,"skills":[{"name":"Aiming","stat":"Dex"},{"name":"Perception","stat":"Int"},{"name":"Tactics","stat":"Int"}]},{"id":"hobby-5","stage":"hobby","name":"Gym Rat","rank":2,"skills":[{"name":"Running","stat":"Dex"},{"name":"Endurance","stat":"Con"},{"name":"Swimming","stat":"Str"}]},{"id":"hobby-6","stage":"hobby","name":"Hunting","rank":2,"skills":[{"name":"Tracking","stat":"Int"},{"name":"Shotgun","stat":"Dex"},{"name":"Stealth","stat":"Dex"}]},{"id":"hobby-7","stage":"hobby","name":"Music","rank":2,"skills":[{"name":"Perception","stat":"Int"},{"name":"Performance","stat":"Cha"},{"name":"Sleight of Hand","stat":"Dex"}]},{"id":"hobby-8","stage":"hobby","name":"Motorsports","rank":2,"skills":[{"name":"Driving","stat":"Dex"},{"name":"Repair","stat":"Int"},{"name":"Salvage","stat":"Int"}]},{"id":"hobby-9","stage":"hobby","name":"Climber","rank":2,"skills":[{"name":"Climbing","stat":"Str"},{"name":"Jumping","stat":"Str"},{"name":"Endurance","stat":"Con"}]},{"id":"hobby-10","stage":"hobby","name":"Pop Culture","rank":2,"skills":[{"name":"Determine Value","stat":null},{"name":"Investigation","stat":"Int"},{"name":"Perception","stat":"Int"}]},{"id":"hobby-11","stage":"hobby","name":"Tinkering","rank":2,"skills":[{"name":"Engineering","stat":"Int"},{"name":"Repair","stat":"Int"},{"name":"Salvage","stat":"Int"}]},{"id":"hobby-12","stage":"hobby","name":"Travel","rank":2,"skills":[{"name":"Endurance","stat":"Con"},{"name":"Negotiation","stat":"Cha"},{"name":"Streetwise","stat":"Cha"}]}],"combat":[{"id":"club","name":"Club","kind":"weapon"},{"id":"improvised-weapons","name":"Improvised Weapons","kind":"weapon"},{"id":"warhammer","name":"Warhammer","kind":"weapon"},{"id":"axe","name":"Axe","kind":"weapon"},{"id":"dagger","name":"Dagger","kind":"weapon"},{"id":"longsword","name":"Longsword","kind":"weapon"},{"id":"rapier","name":"Rapier","kind":"weapon"},{"id":"bow","name":"Bow","kind":"weapon"},{"id":"crossbow","name":"Crossbow","kind":"weapon"},{"id":"handgun","name":"Handgun","kind":"weapon"},{"id":"shotgun","name":"Shotgun","kind":"weapon"},{"id":"javelin","name":"Javelin","kind":"weapon"},{"id":"shuriken","name":"Shuriken","kind":"weapon"},{"id":"slingshot","name":"Slingshot","kind":"weapon"},{"id":"herding-weapons","name":"Herding Weapons","kind":"weapon"},{"id":"lance","name":"Lance","kind":"weapon"},{"id":"polearm","name":"Polearm","kind":"weapon"},{"id":"quarterstaff","name":"Quarterstaff","kind":"weapon"},{"id":"dirt-clod","name":"Dirt Clod","kind":"spell"},{"id":"fire-fingers","name":"Fire Fingers","kind":"spell"},{"id":"frost-scar","name":"Frost Scar","kind":"spell"},{"id":"mind-tickle","name":"Mind Tickle","kind":"spell"},{"id":"shock-treatment","name":"Shock Treatment","kind":"spell"},{"id":"soul-collector","name":"Soul Collector","kind":"spell"},{"id":"vine-porn","name":"Vine Porn","kind":"spell"},{"id":"pugilism","name":"Pugilism","kind":"unarmed","effect":"Iron Punch"},{"id":"foot-soldier","name":"Foot Soldier","kind":"unarmed","effect":"Smush"},{"id":"noggin-nocker","name":"Noggin Nocker","kind":"unarmed","effect":"Skullcracker"},{"id":"wrasslin","name":"Wrasslin’","kind":"unarmed","effect":"Toss"}]}$catalog$::jsonb);
create table dcc_private.tutorial_rolls (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.dcc_campaigns(id),
 owner_user_id uuid not null references auth.users(id), stats jsonb not null, unique(campaign_id,owner_user_id)
);
create table dcc_private.tutorial_legacy_archive (crawler_id uuid primary key references public.dcc_crawlers(id), snapshot jsonb not null);
revoke all on dcc_private.tutorial_catalog,dcc_private.tutorial_rolls,dcc_private.tutorial_legacy_archive from public,anon,authenticated;

create function dcc_private.tutorial_int(p_value jsonb,p_min bigint,p_max bigint) returns integer
language plpgsql immutable security invoker set search_path='' as $$
declare n numeric;
begin
 if jsonb_typeof(p_value) is distinct from 'number' then raise exception 'Expected a number.' using errcode='22023'; end if;
 n := p_value::text::numeric;
 if n<>trunc(n) or n<p_min or n>p_max then raise exception 'Number outside supported range.' using errcode='22023'; end if;
 return n::integer;
end $$;
create function dcc_private.tutorial_modifier(n integer) returns integer
language sql immutable security invoker set search_path='' as $$
 select case when n<=2 then 1 when n<=5 then 2 when n<=9 then 3 when n<=19 then 4 when n<=49 then 5 when n<=99 then 6 when n<=149 then 7 when n<=199 then 8 when n<=299 then 9 else 10 end;
$$;
create function dcc_private.validate_tutorial(p jsonb, creating boolean) returns void
language plpgsql security definer set search_path='' as $$
declare k text; st text; cat jsonb; option_row jsonb; names text[] := array['Unarmed Combat']; chosen text; score integer; initial integer; seen integer[]:=array[]::integer[]; combat jsonb;
begin
 if octet_length(p::text)>20000 then raise exception 'Tutorial profile is too large.' using errcode='22023'; end if;
 if p->'version' is distinct from '1'::jsonb or p->>'method' not in ('array','rolled') or p->>'method' is null or jsonb_typeof(p->'pronouns') is distinct from 'string' or length(p->>'pronouns')>80 then raise exception 'Invalid tutorial profile.' using errcode='22023'; end if;
 foreach k in array array['strength','intelligence','constitution','dexterity','charisma'] loop
  initial:=dcc_private.tutorial_int(p#>array['initialStats',k],2,6); seen:=array_append(seen,initial);
  score:=dcc_private.tutorial_int(p#>array['stats',k,'base'],1,10000);
  if creating and score<>initial then raise exception 'Starting stats must match.' using errcode='22023'; end if;
  score:=dcc_private.tutorial_int(p#>array['stats',k,'enhanced'],1,10000);
  if creating and score<>initial then raise exception 'Starting enhancements must match.' using errcode='22023'; end if;
 end loop;
 if p->>'method'='array' and (select array_agg(v order by v) from unnest(seen) v)<>array[2,3,4,5,6] then raise exception 'Use each standard-array value once.' using errcode='22023'; end if;
 select data into cat from dcc_private.tutorial_catalog where id=true;
 foreach st in array array['childhood','adolescence','career','hobby'] loop
  select value into option_row from jsonb_array_elements(cat->'backgrounds') where value->>'id'=p#>>array['backgrounds',st,'category'] and value->>'stage'=st;
  if option_row is null or jsonb_typeof(p#>array['backgrounds',st,'skills']) is distinct from 'array' then raise exception 'Choose a background.' using errcode='22023'; end if;
  if jsonb_array_length(p#>array['backgrounds',st,'skills'])<>2 then raise exception 'Choose two Skills per background.' using errcode='22023'; end if;
  for chosen in select jsonb_array_elements_text(p#>array['backgrounds',st,'skills']) loop
   if not exists(select 1 from jsonb_array_elements(option_row->'skills') where value->>'name'=chosen) then raise exception 'Skill does not belong to background.' using errcode='22023'; end if;
   names:=array_append(names,chosen);
  end loop;
 end loop;
 select value into combat from jsonb_array_elements(cat->'combat') where value->>'id'=p->>'combatId';
 if combat is null then raise exception 'Choose a combat Skill.' using errcode='22023'; end if;
 names:=array_append(names,combat->>'name');
 if (select count(distinct v) from unnest(names) v)<>10 then raise exception 'Choose ten different Skills.' using errcode='22023'; end if;
 if combat->>'kind'='spell' and (p#>>'{initialStats,intelligence}')::integer<4 then raise exception 'Attack Spell requires Intelligence 4.' using errcode='22023'; end if;
 foreach k in array array['trauma','looseEnds','regret','gear'] loop
  if jsonb_typeof(p#>array['notes',k]) is distinct from 'string' or length(p#>>array['notes',k])>(case when k='gear' then 4000 else 2000 end) then raise exception 'Invalid notes.' using errcode='22023'; end if;
 end loop;
 perform dcc_private.tutorial_int(p->'mana',0,(p#>>'{stats,intelligence,enhanced}')::bigint);
 perform dcc_private.tutorial_int(p->'favor',0,2147483647);
 if creating and (p->'favor'<>'1'::jsonb or p->'mana'<>p#>'{initialStats,intelligence}') then raise exception 'Invalid starting resources.' using errcode='22023'; end if;
end $$;

create function dcc_private.tutorial_roll(p_campaign_id uuid,p_owner_user_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r dcc_private.tutorial_rolls%rowtype; scores jsonb:='{}'; k text;
begin
 if not dcc_private.is_member(p_campaign_id) or (p_owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(p_campaign_id)) then raise exception 'Not permitted.' using errcode='42501'; end if;
 if not exists(select 1 from public.dcc_campaign_members where campaign_id=p_campaign_id and user_id=p_owner_user_id union all select 1 from public.dcc_campaigns where id=p_campaign_id and gm_user_id=p_owner_user_id) then raise exception 'Owner must be a member.' using errcode='22023'; end if;
 if exists(select 1 from public.dcc_crawlers where campaign_id=p_campaign_id and owner_user_id=p_owner_user_id and ruleset='tutorial-v1') then raise exception 'Crawler already exists.' using errcode='22023'; end if;
 foreach k in array array['strength','intelligence','constitution','dexterity','charisma'] loop scores:=scores||jsonb_build_object(k,floor(random()*5)::integer+2); end loop;
 insert into dcc_private.tutorial_rolls(campaign_id,owner_user_id,stats) values(p_campaign_id,p_owner_user_id,scores) on conflict(campaign_id,owner_user_id) do nothing;
 select * into r from dcc_private.tutorial_rolls where campaign_id=p_campaign_id and owner_user_id=p_owner_user_id;
 return jsonb_build_object('id',r.id,'scores',r.stats);
end $$;

create function dcc_private.create_tutorial(p_campaign_id uuid,p_owner_user_id uuid,p_name text,p_profile jsonb,p_roll_id uuid default null,p_convert_id uuid default null,p_expected_version uuid default null,p_slots integer default 10)
returns void language plpgsql security definer set search_path='' as $$
declare r dcc_private.tutorial_rolls%rowtype; old_row public.dcc_crawlers%rowtype; n integer;
begin
 if not dcc_private.is_member(p_campaign_id) or (p_owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(p_campaign_id)) then raise exception 'Not permitted.' using errcode='42501'; end if;
 if not exists(select 1 from public.dcc_campaign_members where campaign_id=p_campaign_id and user_id=p_owner_user_id union all select 1 from public.dcc_campaigns where id=p_campaign_id and gm_user_id=p_owner_user_id) then raise exception 'Owner must belong to game.' using errcode='22023'; end if;
 if p_name is null or length(btrim(p_name)) not between 1 and 200 then raise exception 'Invalid crawler name.' using errcode='22023'; end if;
 perform dcc_private.validate_tutorial(p_profile,true);
 select * into r from dcc_private.tutorial_rolls where campaign_id=p_campaign_id and owner_user_id=p_owner_user_id;
 if found then
  if p_profile->>'method'<>'rolled' or p_roll_id is distinct from r.id or p_profile->'initialStats' is distinct from r.stats then raise exception 'Recover your saved roll; rolled stats cannot be changed.' using errcode='22023'; end if;
 elsif p_profile->>'method'='rolled' then raise exception 'Roll stats on the server first.' using errcode='22023';
 end if;
 select next_crawler_number into n from public.dcc_campaigns where id=p_campaign_id for update;
 while exists(select 1 from public.dcc_crawlers where campaign_id=p_campaign_id and crawler_number=n) loop n:=n+1; end loop;
 if n>12900000 then raise exception 'Generated number range exhausted; contact the GM.' using errcode='22023'; end if;
 if p_convert_id is null then
  if p_slots is distinct from 10 then raise exception 'New crawlers start at full health.' using errcode='22023'; end if;
  insert into public.dcc_crawlers(campaign_id,owner_user_id,name,base_segments,constitution,current_segments,ruleset,tutorial_profile,crawler_number)
   values(p_campaign_id,p_owner_user_id,btrim(p_name),10,(p_profile#>>'{stats,constitution,enhanced}')::integer,10,'tutorial-v1',p_profile,n);
 else
  if not dcc_private.is_gm(p_campaign_id) then raise exception 'Only the GM can convert prototypes.' using errcode='42501'; end if;
  select * into old_row from public.dcc_crawlers where id=p_convert_id and campaign_id=p_campaign_id and owner_user_id=p_owner_user_id for update;
  if not found or old_row.ruleset<>'prototype' then raise exception 'Prototype not found.' using errcode='22023'; end if;
  if old_row.version is distinct from p_expected_version then raise exception 'Crawler changed; refresh.' using errcode='40001'; end if;
  if p_slots is null or p_slots not between 0 and 10 or (old_row.current_segments=0 and p_slots<>0) then raise exception 'Choose remaining slots explicitly; zero must stay zero.' using errcode='22023'; end if;
  insert into dcc_private.tutorial_legacy_archive(crawler_id,snapshot) values(old_row.id,to_jsonb(old_row));
  update public.dcc_crawlers set name=btrim(p_name),base_segments=10,constitution=(p_profile#>>'{stats,constitution,enhanced}')::integer,current_segments=p_slots,ruleset='tutorial-v1',tutorial_profile=p_profile,crawler_number=n,version=gen_random_uuid() where id=old_row.id;
 end if;
 update public.dcc_campaigns set next_crawler_number=n+1 where id=p_campaign_id;
end $$;

create function dcc_private.tutorial_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_amount bigint default 0,p_stats jsonb default null,p_number integer default null)
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
  p:=jsonb_set(p,'{stats}',p_stats);mana:=least(mana,(p_stats#>>'{intelligence,enhanced}')::integer);
 when 'number' then
  if not dcc_private.is_gm(r.campaign_id) then raise exception 'Only the GM edits Crawler Numbers.' using errcode='42501'; end if;
  if p_number is null or p_number<1 then raise exception 'Use a positive number.' using errcode='22023'; end if;
 else raise exception 'Unknown tutorial action.' using errcode='22023';
 end case;
 p:=jsonb_set(jsonb_set(p,'{mana}',to_jsonb(mana)),'{favor}',to_jsonb(favor));
 perform dcc_private.validate_tutorial(p,false);
 update public.dcc_crawlers set current_segments=slots,tutorial_profile=p,constitution=(p#>>'{stats,constitution,enhanced}')::integer,crawler_number=case when p_operation='number' then p_number else crawler_number end,version=gen_random_uuid() where id=r.id;
end $$;

-- Retain legacy operations for prototypes but prevent bypassing the official
-- rules through the older RPC names.
create or replace function dcc_private.change_health(p_crawler_id uuid, p_expected_version uuid, p_adjustment bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.dcc_crawlers%rowtype;
begin
  select * into v_row from public.dcc_crawlers where id = p_crawler_id for update;
  if not found or not dcc_private.is_member(v_row.campaign_id) or
    (v_row.owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(v_row.campaign_id)) then
    raise exception 'Crawler access is not permitted.' using errcode = '42501';
  end if;
  if v_row.ruleset='tutorial-v1' then raise exception 'Use the tutorial action.' using errcode='42501'; end if;
  if p_expected_version is distinct from v_row.version then
    raise exception 'Crawler changed. Refresh before trying again.' using errcode = '40001';
  end if;
  if p_adjustment is null or p_adjustment not between -9007199254740991 and 9007199254740991 then
    raise exception 'Invalid health adjustment.' using errcode = '22023';
  end if;
  update public.dcc_crawlers set
    current_segments = least(v_row.max_segments::bigint, greatest(0::bigint, v_row.current_segments::bigint + p_adjustment))::integer,
    version = gen_random_uuid()
  where id = p_crawler_id;
end;
$$;
create or replace function dcc_private.update_stats(
  p_crawler_id uuid, p_expected_version uuid, p_base_segments integer, p_constitution integer
) returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.dcc_crawlers%rowtype; v_max integer;
begin
  select * into v_row from public.dcc_crawlers where id = p_crawler_id for update;
  if not found or not dcc_private.is_gm(v_row.campaign_id) then
    raise exception 'Only the GM can edit existing stats.' using errcode = '42501';
  end if;
  if v_row.ruleset='tutorial-v1' then raise exception 'Use the tutorial action.' using errcode='42501'; end if;
  if p_expected_version is distinct from v_row.version then
    raise exception 'Crawler changed. Refresh before trying again.' using errcode = '40001';
  end if;
  if p_base_segments is null or p_base_segments not between 1 and 10000 or
     p_constitution is null or p_constitution not between 0 and 10000 then
    raise exception 'Invalid crawler stats.' using errcode = '22023';
  end if;
  v_max := greatest(1, p_base_segments + floor((p_constitution - 10)::numeric / 2)::integer);
  update public.dcc_crawlers set base_segments = p_base_segments, constitution = p_constitution,
    current_segments = least(v_row.current_segments, v_max), version = gen_random_uuid()
  where id = p_crawler_id;
end;
$$;

create function public.dcc_tutorial_roll(p_campaign_id uuid,p_owner_user_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select dcc_private.tutorial_roll(p_campaign_id,p_owner_user_id); $$;
create function public.dcc_create_tutorial(p_campaign_id uuid,p_owner_user_id uuid,p_name text,p_profile jsonb,p_roll_id uuid default null,p_convert_id uuid default null,p_expected_version uuid default null,p_slots integer default 10) returns void language sql security invoker set search_path='' as $$ select dcc_private.create_tutorial(p_campaign_id,p_owner_user_id,p_name,p_profile,p_roll_id,p_convert_id,p_expected_version,p_slots); $$;
create function public.dcc_tutorial_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_amount bigint default 0,p_stats jsonb default null,p_number integer default null) returns void language sql security invoker set search_path='' as $$ select dcc_private.tutorial_action(p_crawler_id,p_expected_version,p_operation,p_amount,p_stats,p_number); $$;
revoke all on function dcc_private.tutorial_int(jsonb,bigint,bigint),dcc_private.tutorial_modifier(integer),dcc_private.validate_tutorial(jsonb,boolean),dcc_private.tutorial_roll(uuid,uuid),dcc_private.create_tutorial(uuid,uuid,text,jsonb,uuid,uuid,uuid,integer),dcc_private.tutorial_action(uuid,uuid,text,bigint,jsonb,integer) from public,anon,authenticated;
grant execute on function dcc_private.tutorial_int(jsonb,bigint,bigint),dcc_private.tutorial_modifier(integer),dcc_private.validate_tutorial(jsonb,boolean),dcc_private.tutorial_roll(uuid,uuid),dcc_private.create_tutorial(uuid,uuid,text,jsonb,uuid,uuid,uuid,integer),dcc_private.tutorial_action(uuid,uuid,text,bigint,jsonb,integer) to authenticated;
revoke all on function public.dcc_tutorial_roll(uuid,uuid),public.dcc_create_tutorial(uuid,uuid,text,jsonb,uuid,uuid,uuid,integer),public.dcc_tutorial_action(uuid,uuid,text,bigint,jsonb,integer) from public,anon,authenticated;
grant execute on function public.dcc_tutorial_roll(uuid,uuid),public.dcc_create_tutorial(uuid,uuid,text,jsonb,uuid,uuid,uuid,integer),public.dcc_tutorial_action(uuid,uuid,text,bigint,jsonb,integer) to authenticated;
notify pgrst,'reload schema';
commit;
