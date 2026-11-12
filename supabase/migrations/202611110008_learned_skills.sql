begin;
alter table public.dcc_crawlers add column learned_skills jsonb;
create table dcc_private.ability_catalog(id boolean primary key default true check(id),data jsonb not null);
insert into dcc_private.ability_catalog(data) values($ability_catalog$[{"id":"aiming","name":"Aiming","kind":"skill","stat":null,"passive":true,"advancement":"special","maxRank":15,"manaCost":null,"description":"Passive ranged-attack support. Mark only when applying its Ranks to the qualifying ranged Attack.","reference":"Core Rulebook p. 184","damage":"","range":"","automation":"manual"},{"id":"animal-handling","name":"Animal Handling","kind":"skill","stat":"charisma","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 185","damage":"","range":"","automation":"manual"},{"id":"axe","name":"Axe","kind":"attack","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 178","damage":"1d6 + Str Slashing","range":"","automation":"manual"},{"id":"bow","name":"Bow","kind":"attack","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 181","damage":"1d6 + Str Piercing","range":"100 feet","automation":"manual"},{"id":"catcher","name":"Catcher","kind":"skill","stat":null,"passive":true,"advancement":"none","maxRank":15,"manaCost":null,"description":"Passive protection of an ally from a direct hit. Ordinary use does not receive advancement marks.","reference":"Core Rulebook p. 187","damage":"","range":"","automation":"manual"},{"id":"chopper-pilot","name":"Chopper Pilot","kind":"skill","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 187","damage":"","range":"","automation":"manual"},{"id":"climbing","name":"Climbing","kind":"skill","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 188","damage":"","range":"","automation":"manual"},{"id":"club","name":"Club","kind":"attack","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 178","damage":"1d6 + Str Bludgeoning","range":"","automation":"manual"},{"id":"crossbow","name":"Crossbow","kind":"attack","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 181","damage":"1d8 Piercing","range":"50 feet","automation":"manual"},{"id":"dagger","name":"Dagger","kind":"attack","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 178","damage":"1d4 + Str Piercing","range":"","automation":"manual"},{"id":"deception","name":"Deception","kind":"skill","stat":"charisma","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 189","damage":"","range":"","automation":"manual"},{"id":"detect-lies","name":"Detect Lies","kind":"skill","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 189","damage":"","range":"","automation":"manual"},{"id":"determine-value","name":"Determine Value","kind":"skill","stat":null,"passive":true,"advancement":"none","maxRank":15,"manaCost":null,"description":"Passive valuation support. Ranks increase through magical means; ordinary-use advancement marks are unavailable.","reference":"Core Rulebook p. 189","damage":"","range":"","automation":"manual"},{"id":"dirt-clod","name":"Dirt Clod","kind":"spell","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":1,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 204","damage":"1d2 + Int Bludgeoning","range":"100 feet","automation":"manual"},{"id":"driving","name":"Driving","kind":"skill","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 190","damage":"","range":"","automation":"manual"},{"id":"dumpster-diving","name":"Dumpster Diving","kind":"skill","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 190","damage":"","range":"","automation":"manual"},{"id":"endurance","name":"Endurance","kind":"skill","stat":"constitution","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 190","damage":"","range":"","automation":"manual"},{"id":"engineering","name":"Engineering","kind":"skill","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 191","damage":"","range":"","automation":"manual"},{"id":"escape-artist","name":"Escape Artist","kind":"skill","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 191","damage":"","range":"","automation":"manual"},{"id":"fabricate","name":"Fabricate","kind":"skill","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 191","damage":"","range":"","automation":"manual"},{"id":"fire-fingers","name":"Fire Fingers","kind":"spell","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":3,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 205","damage":"1d4 + Int Fire","range":"Melee","automation":"manual"},{"id":"first-aid","name":"First Aid","kind":"skill","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 192","damage":"","range":"","automation":"manual"},{"id":"foot-soldier","name":"Foot Soldier","kind":"attack","stat":"strength","passive":false,"advancement":"special","maxRank":15,"manaCost":null,"description":"Hand-to-hand Attack. When adding a Damage Effect, mark this Skill OR the Damage Effect for that attack, never both. Resolve damage and Rank upgrades at the table.","reference":"Core Rulebook p. 179","damage":"1d4 + Str Bludgeoning","range":"","automation":"manual"},{"id":"frost-scar","name":"Frost Scar","kind":"spell","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":2,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 205","damage":"1d4 + Int Ice","range":"Melee","automation":"manual"},{"id":"good-first-impression","name":"Good First Impression","kind":"skill","stat":"charisma","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 193","damage":"","range":"","automation":"manual"},{"id":"handgun","name":"Handgun","kind":"attack","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 181","damage":"1d8 Piercing","range":"150 feet","automation":"manual"},{"id":"heal","name":"Heal","kind":"spell","stat":null,"passive":true,"advancement":"none","maxRank":1,"manaCost":2,"description":"Spend 2 Mana to restore 2 Health Bar slots on yourself. Cannot cast while Dying. Rank 1 maximum.","reference":"Core Rulebook p. 206","damage":"","range":"Self only","automation":"tutorial-heal"},{"id":"herding-weapons","name":"Herding Weapons","kind":"attack","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 182","damage":"1d4 + Str Bludgeoning","range":"10 feet","automation":"manual"},{"id":"hide-in-shadows","name":"Hide in Shadows","kind":"skill","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 193","damage":"","range":"","automation":"manual"},{"id":"improvised-weapons","name":"Improvised Weapons","kind":"attack","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 178","damage":"1d4 + Str Bludgeoning","range":"","automation":"manual"},{"id":"intimidate","name":"Intimidate","kind":"skill","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 194","damage":"","range":"","automation":"manual"},{"id":"investigation","name":"Investigation","kind":"skill","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 194","damage":"","range":"","automation":"manual"},{"id":"iron-punch","name":"Iron Punch","kind":"effect","stat":null,"passive":true,"advancement":"special","maxRank":15,"manaCost":null,"description":"Hand-to-hand Damage Effect. For one attack, mark this effect OR the associated Attack Skill, not both.","reference":"Core Rulebook p. 180","damage":"","range":"","automation":"manual"},{"id":"javelin","name":"Javelin","kind":"attack","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 182","damage":"1d8 + Str Piercing","range":"40 feet","automation":"manual"},{"id":"jumping","name":"Jumping","kind":"skill","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 194","damage":"","range":"","automation":"manual"},{"id":"lance","name":"Lance","kind":"attack","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 182","damage":"1d12 + Str Piercing","range":"10 feet","automation":"manual"},{"id":"longsword","name":"Longsword","kind":"attack","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 178","damage":"1d8 + Str Slashing","range":"","automation":"manual"},{"id":"mind-tickle","name":"Mind Tickle","kind":"spell","stat":"charisma","passive":false,"advancement":"normal","maxRank":15,"manaCost":2,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 208","damage":"1d2 + Cha Psychic","range":"40 feet","automation":"manual"},{"id":"negotiation","name":"Negotiation","kind":"skill","stat":"charisma","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 195","damage":"","range":"","automation":"manual"},{"id":"noggin-nocker","name":"Noggin Nocker","kind":"attack","stat":"strength","passive":false,"advancement":"special","maxRank":15,"manaCost":null,"description":"Hand-to-hand Attack. When adding a Damage Effect, mark this Skill OR the Damage Effect for that attack, never both. Resolve damage and Rank upgrades at the table.","reference":"Core Rulebook p. 179","damage":"1d4 + Con Bludgeoning","range":"","automation":"manual"},{"id":"perception","name":"Perception","kind":"skill","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 196","damage":"","range":"","automation":"manual"},{"id":"performance","name":"Performance","kind":"skill","stat":"charisma","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 196","damage":"","range":"","automation":"manual"},{"id":"persuasion","name":"Persuasion","kind":"skill","stat":"charisma","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 196","damage":"","range":"","automation":"manual"},{"id":"polearm","name":"Polearm","kind":"attack","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 183","damage":"1d8 + Str Piercing","range":"10 feet","automation":"manual"},{"id":"pugilism","name":"Pugilism","kind":"attack","stat":"dexterity","passive":false,"advancement":"special","maxRank":15,"manaCost":null,"description":"Hand-to-hand Attack. When adding a Damage Effect, mark this Skill OR the Damage Effect for that attack, never both. Resolve damage and Rank upgrades at the table.","reference":"Core Rulebook p. 179","damage":"","range":"","automation":"manual"},{"id":"quarterstaff","name":"Quarterstaff","kind":"attack","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 183","damage":"1d6 + Str Bludgeoning","range":"10 feet","automation":"manual"},{"id":"rapier","name":"Rapier","kind":"attack","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 178","damage":"1d6 + Dex Piercing","range":"","automation":"manual"},{"id":"repair","name":"Repair","kind":"skill","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 197","damage":"","range":"","automation":"manual"},{"id":"running","name":"Running","kind":"skill","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 197","damage":"","range":"","automation":"manual"},{"id":"salvage","name":"Salvage","kind":"skill","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 198","damage":"","range":"","automation":"manual"},{"id":"shock-treatment","name":"Shock Treatment","kind":"spell","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":2,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 212","damage":"1d2 + Int Electric","range":"30 feet","automation":"manual"},{"id":"shotgun","name":"Shotgun","kind":"attack","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 182","damage":"1d10 Piercing","range":"30 feet","automation":"manual"},{"id":"shuriken","name":"Shuriken","kind":"attack","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 182","damage":"1d4 + Str Piercing","range":"30 feet","automation":"manual"},{"id":"skullcracker","name":"Skullcracker","kind":"effect","stat":null,"passive":true,"advancement":"special","maxRank":15,"manaCost":null,"description":"Hand-to-hand Damage Effect. For one attack, mark this effect OR the associated Attack Skill, not both.","reference":"Core Rulebook p. 180","damage":"","range":"","automation":"manual"},{"id":"sleight-of-hand","name":"Sleight of Hand","kind":"skill","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 198","damage":"","range":"","automation":"manual"},{"id":"slingshot","name":"Slingshot","kind":"attack","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 182","damage":"1d2 + Str Bludgeoning","range":"30 feet","automation":"manual"},{"id":"smush","name":"Smush","kind":"effect","stat":null,"passive":true,"advancement":"special","maxRank":15,"manaCost":null,"description":"Hand-to-hand Damage Effect. For one attack, mark this effect OR the associated Attack Skill, not both.","reference":"Core Rulebook p. 181","damage":"","range":"","automation":"manual"},{"id":"soul-collector","name":"Soul Collector","kind":"spell","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":4,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 212","damage":"1d4 + Int Necrotic","range":"50 feet","automation":"manual"},{"id":"stealth","name":"Stealth","kind":"skill","stat":"dexterity","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 199","damage":"","range":"","automation":"manual"},{"id":"streetwise","name":"Streetwise","kind":"skill","stat":"charisma","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 199","damage":"","range":"","automation":"manual"},{"id":"survival","name":"Survival","kind":"skill","stat":"constitution","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 199","damage":"","range":"","automation":"manual"},{"id":"swimming","name":"Swimming","kind":"skill","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 199","damage":"","range":"","automation":"manual"},{"id":"tactics","name":"Tactics","kind":"skill","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 200","damage":"","range":"","automation":"manual"},{"id":"taunt","name":"Taunt","kind":"skill","stat":"charisma","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 200","damage":"","range":"","automation":"manual"},{"id":"throwing","name":"Throwing","kind":"skill","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 200","damage":"","range":"","automation":"manual"},{"id":"toss","name":"Toss","kind":"effect","stat":null,"passive":true,"advancement":"special","maxRank":15,"manaCost":null,"description":"Hand-to-hand Damage Effect. For one attack, mark this effect OR the associated Attack Skill, not both.","reference":"Core Rulebook p. 181","damage":"","range":"","automation":"manual"},{"id":"tracking","name":"Tracking","kind":"skill","stat":"intelligence","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 201","damage":"","range":"","automation":"manual"},{"id":"unarmed-combat","name":"Unarmed Combat","kind":"attack","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 179","damage":"1d4 + Str Bludgeoning","range":"","automation":"manual"},{"id":"vine-porn","name":"Vine Porn","kind":"spell","stat":"constitution","passive":false,"advancement":"normal","maxRank":15,"manaCost":3,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 213","damage":"1d4 + Con Piercing","range":"20 feet","automation":"manual"},{"id":"warhammer","name":"Warhammer","kind":"attack","stat":"strength","passive":false,"advancement":"normal","maxRank":15,"manaCost":null,"description":"Refer to the listed entry for conditions, damage, cooldowns, and Rank upgrades. Effects are adjudicated at the table.","reference":"Core Rulebook p. 178","damage":"1d10 + Str Bludgeoning","range":"","automation":"manual"},{"id":"wrasslin","name":"Wrasslin’","kind":"attack","stat":"strength","passive":false,"advancement":"special","maxRank":15,"manaCost":null,"description":"Hand-to-hand Attack. When adding a Damage Effect, mark this Skill OR the Damage Effect for that attack, never both. Resolve damage and Rank upgrades at the table.","reference":"Core Rulebook p. 179","damage":"1d4 + Str Bludgeoning","range":"","automation":"manual"}]$ability_catalog$::jsonb);
revoke all on dcc_private.ability_catalog from public,anon,authenticated;
create function dcc_private.validate_abilities(p jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare a jsonb; last jsonb; rank integer; cap integer; cost integer; k text; ids text[]:=array[]::text[]; names text[]:=array[]::text[];
begin
 if jsonb_typeof(p) is distinct from 'array' then raise exception 'Invalid abilities.' using errcode='22023';end if;
 if jsonb_array_length(p) not between 1 and 200 then raise exception 'Expected 1 to 200 learned abilities.' using errcode='22023';end if;
 for a in select value from jsonb_array_elements(p) loop
  if jsonb_typeof(a) is distinct from 'object' or jsonb_typeof(a->'id') is distinct from 'string' or (a->>'id') !~ '^[a-z0-9][a-z0-9-]{0,79}$' then raise exception 'Invalid ability ID.' using errcode='22023';end if;
  foreach k in array array['name','description','reference','damage','range'] loop
   if jsonb_typeof(a->k) is distinct from 'string' then raise exception 'Invalid ability text.' using errcode='22023';end if;
  end loop;
  if length(btrim(a->>'name')) not between 1 and 120 or length(a->>'description')>2000 or length(a->>'reference')>200 or length(a->>'damage')>120 or length(a->>'range')>80 then raise exception 'Ability text exceeds supported limits.' using errcode='22023';end if;
  if a->>'id'=any(ids) or lower(btrim(a->>'name'))=any(names) then raise exception 'Ability already learned.' using errcode='22023';end if;
  ids:=array_append(ids,a->>'id');names:=array_append(names,lower(btrim(a->>'name')));
  if jsonb_typeof(a->'kind') is distinct from 'string' or a->>'kind' not in ('skill','attack','spell','effect') or jsonb_typeof(a->'advancement') is distinct from 'string' or a->>'advancement' not in ('normal','special','none') or jsonb_typeof(a->'automation') is distinct from 'string' or a->>'automation' not in ('manual','tutorial-heal') or jsonb_typeof(a->'origin') is distinct from 'string' or a->>'origin' not in ('creation','gm') then raise exception 'Invalid ability settings.' using errcode='22023';end if;
  if jsonb_typeof(a->'passive') is distinct from 'boolean' or jsonb_typeof(a->'marked') is distinct from 'boolean' then raise exception 'Invalid ability flags.' using errcode='22023';end if;
  if a->'stat' is distinct from 'null'::jsonb and (jsonb_typeof(a->'stat') is distinct from 'string' or a->>'stat' not in ('strength','intelligence','constitution','dexterity','charisma')) then raise exception 'Invalid governing stat.' using errcode='22023';end if;
  rank:=dcc_private.tutorial_int(a->'rank',1,20);cap:=dcc_private.tutorial_int(a->'maxRank',1,20);
  if rank>cap then raise exception 'Rank exceeds reviewed limit.' using errcode='22023';end if;
  if (a->>'passive')::boolean and (a->>'advancement'='normal' or a->'stat' is distinct from 'null'::jsonb) then raise exception 'Passive abilities need a special marking rule or no marks and no ordinary check stat.' using errcode='22023';end if;
  if a->>'kind'='spell' then cost:=dcc_private.tutorial_int(a->'manaCost',0,10000);
  elsif a->'manaCost' is distinct from 'null'::jsonb then raise exception 'Only Spells have Mana costs.' using errcode='22023';end if;
  if (a->>'marked')::boolean and (a->>'advancement'='none' or rank>=least(15,cap)) then raise exception 'Ability cannot hold an ordinary advancement mark.' using errcode='22023';end if;
  if a->>'id'='heal' or a->>'automation'='tutorial-heal' or lower(btrim(a->>'name'))='heal' then
   if a->>'id'<>'heal' or a->>'name'<>'Heal' or a->>'kind'<>'spell' or rank<>1 or cap<>1 or a->>'passive'<>'true' or a->'stat' is distinct from 'null'::jsonb or a->>'advancement'<>'none' or a->>'automation'<>'tutorial-heal' or a->>'marked'<>'false' or cost<>2 then raise exception 'Tutorial Heal is protected at Rank 1.' using errcode='22023';end if;
  end if;
  if a ? 'lastAdvancement' then
   last:=a->'lastAdvancement';if jsonb_typeof(last) is distinct from 'object' or last->>'window' is null or last->>'window' not in ('two-hour','floor-end') then raise exception 'Invalid advancement result.' using errcode='22023';end if;
   perform dcc_private.tutorial_int(last->'die',1,20);perform dcc_private.tutorial_int(last->'modifier',-100,100);perform dcc_private.tutorial_int(last->'fromRank',1,14);perform dcc_private.tutorial_int(last->'toRank',1,15);
  end if;
 end loop;
 if not ('heal'=any(ids)) then raise exception 'Tutorial Heal must remain learned.' using errcode='22023';end if;
end $$;
create function dcc_private.seed_abilities(profile jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb:='[]'; meta jsonb; tutorial jsonb; cat jsonb; stage text; name text; combat jsonb;
begin
 select data into tutorial from dcc_private.tutorial_catalog;
 foreach stage in array array['childhood','adolescence','career','hobby'] loop
  select value into cat from jsonb_array_elements(tutorial->'backgrounds') where value->>'id'=profile#>>array['backgrounds',stage,'category'];
  for name in select jsonb_array_elements_text(profile#>array['backgrounds',stage,'skills']) loop
   select value into meta from dcc_private.ability_catalog,lateral jsonb_array_elements(data) value where value->>'name'=name;
   if meta is null then raise exception 'Missing starting ability definition.' using errcode='22023';end if;
   result:=result||jsonb_build_array(meta||jsonb_build_object('rank',cat->'rank','marked',false,'origin','creation'));
  end loop;
 end loop;
 select value into meta from dcc_private.ability_catalog,lateral jsonb_array_elements(data) value where value->>'id'='unarmed-combat';
 result:=result||jsonb_build_array(meta||jsonb_build_object('rank',3,'marked',false,'origin','creation'));
 select value into meta from dcc_private.ability_catalog,lateral jsonb_array_elements(data) value where value->>'id'=profile->>'combatId';
 result:=result||jsonb_build_array(meta||jsonb_build_object('rank',3,'marked',false,'origin','creation'));
 select value into combat from jsonb_array_elements(tutorial->'combat') where value->>'id'=profile->>'combatId';
 if combat ? 'effect' then
  select value into meta from dcc_private.ability_catalog,lateral jsonb_array_elements(data) value where value->>'name'=combat->>'effect';
  result:=result||jsonb_build_array(meta||jsonb_build_object('rank',3,'marked',false,'origin','creation'));
 end if;
 select value into meta from dcc_private.ability_catalog,lateral jsonb_array_elements(data) value where value->>'id'='heal';
 result:=result||jsonb_build_array(meta||jsonb_build_object('rank',1,'marked',false,'origin','creation'));
 perform dcc_private.validate_abilities(result);return result;
end $$;
create function dcc_private.clean_hotlist(p jsonb,items jsonb,profile jsonb,skills jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare entry jsonb; result jsonb:='[]'; seen text[]:=array[]::text[]; key text;
begin
 if jsonb_typeof(p) is distinct from 'array' then raise exception 'Invalid Hotlist.' using errcode='22023'; end if;
 if jsonb_array_length(p)<>10 then raise exception 'Hotlist must have ten slots.' using errcode='22023'; end if;
 for entry in select value from jsonb_array_elements(p) loop
  if entry='null'::jsonb then result:=result||'[null]'::jsonb;continue;end if;
  if jsonb_typeof(entry) is distinct from 'object' or jsonb_typeof(entry->'kind') is distinct from 'string' or entry->>'kind' not in ('item','skill') or jsonb_typeof(entry->'target') is distinct from 'string' then raise exception 'Invalid Hotlist reference.' using errcode='22023';end if;
  if entry->>'kind'='item' and not exists(select 1 from jsonb_array_elements(items) where value->>'id'=entry->>'target') then result:=result||'[null]'::jsonb;continue;end if;
  if entry->>'kind'='skill' and not exists(select 1 from jsonb_array_elements(skills) ability where ability->>'kind'='spell' and ability->>'id'=entry->>'target') then result:=result||'[null]'::jsonb;continue;end if;
  key:=(entry->>'kind')||':'||(entry->>'target');
  if key=any(seen) then raise exception 'A stack or Spell uses one Hotlist slot.' using errcode='22023';end if;
  seen:=array_append(seen,key);result:=result||jsonb_build_array(entry);
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
 perform dcc_private.validate_inventory(new.inventory);
 totals:=dcc_private.loadout_totals(new.stat_baseline,new.inventory,new.defense_base);
 new.tutorial_profile:=jsonb_set(new.tutorial_profile,'{stats}',totals->'stats');
 new.tutorial_profile:=jsonb_set(new.tutorial_profile,'{mana}',to_jsonb(least((new.tutorial_profile->>'mana')::integer,(totals#>>'{stats,intelligence,enhanced}')::integer)));
 perform dcc_private.validate_tutorial(new.tutorial_profile,false);
 new.constitution:=(totals#>>'{stats,constitution,enhanced}')::integer;
 new.hotlist:=dcc_private.clean_hotlist(new.hotlist,new.inventory,new.tutorial_profile,new.learned_skills);
 return new;
end $$;

create function public.dcc_skill_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_skill_id text default null,p_definition jsonb default null,p_marked boolean default null,p_confirmed boolean default false,p_window text default null,p_die integer default null,p_modifier integer default 0) returns void
language plpgsql security definer set search_path='' as $$
declare r public.dcc_crawlers%rowtype; target jsonb; ability jsonb; result jsonb:='[]'; proposed jsonb; rank integer; cap integer; new_rank integer; cost integer; profile jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first.' using errcode='42501';end if;
 select * into r from public.dcc_crawlers where id=p_crawler_id for update;
 if not found or not dcc_private.is_member(r.campaign_id) or (r.owner_user_id is distinct from auth.uid() and not dcc_private.is_gm(r.campaign_id)) then raise exception 'Ability access denied.' using errcode='42501';end if;
 if r.ruleset<>'tutorial-v1' then raise exception 'Convert the prototype first.' using errcode='22023';end if;
 if r.version is distinct from p_expected_version then raise exception 'Crawler changed; refresh.' using errcode='40001';end if;
 if p_operation is null or p_operation not in ('learn','learn-catalog','edit','remove','mark','advance','cast') then raise exception 'Unknown ability action.' using errcode='22023';end if;
 if p_operation in ('learn','learn-catalog','edit','remove','advance') and not dcc_private.is_gm(r.campaign_id) then raise exception 'Only the GM awards, edits, removes, or advances abilities.' using errcode='42501';end if;
 perform dcc_private.validate_abilities(r.learned_skills);profile:=r.tutorial_profile;
 if p_operation not in ('learn','learn-catalog') then
  select value into target from jsonb_array_elements(r.learned_skills) where value->>'id'=p_skill_id;
  if target is null then raise exception 'Ability unavailable.' using errcode='22023';end if;
 end if;
 if p_operation in ('edit','remove') and target->>'automation'='tutorial-heal' then raise exception 'Tutorial Heal is protected at Rank 1.' using errcode='22023';end if;
 if p_operation in ('learn','edit') then
  if jsonb_typeof(p_definition) is distinct from 'object' then raise exception 'Invalid definition.' using errcode='22023';end if;
  rank:=dcc_private.tutorial_int(p_definition->'rank',1,20);cap:=dcc_private.tutorial_int(p_definition->'maxRank',1,20);
  proposed:=jsonb_build_object('id',case when p_operation='learn' then gen_random_uuid()::text else p_skill_id end,'name',btrim(p_definition->>'name'),'kind',p_definition->'kind','rank',rank,'maxRank',cap,'stat',p_definition->'stat','passive',p_definition->'passive','advancement',p_definition->'advancement','marked',false,'manaCost',p_definition->'manaCost','description',p_definition->'description','reference',p_definition->'reference','damage',p_definition->'damage','range',p_definition->'range','automation','manual','origin',case when p_operation='learn' then 'gm' else target->>'origin' end);
  if p_operation='edit' then
   if target->>'marked'='true' and proposed->>'advancement'<>'none' and rank<least(15,cap) then proposed:=jsonb_set(proposed,'{marked}','true');end if;
   if target ? 'lastAdvancement' then proposed:=proposed||jsonb_build_object('lastAdvancement',target->'lastAdvancement');end if;
  end if;
 elsif p_operation='learn-catalog' then
  select value into proposed from dcc_private.ability_catalog,lateral jsonb_array_elements(data) value where value->>'id'=p_skill_id;
  if proposed is null or p_skill_id='heal' then raise exception 'Choose an available catalog ability.' using errcode='22023';end if;
  rank:=dcc_private.tutorial_int(p_definition->'rank',1,20);
  proposed:=proposed||jsonb_build_object('id',gen_random_uuid()::text,'rank',rank,'origin','gm','marked',false);
 elsif p_operation='remove' then
  if p_confirmed is distinct from true then raise exception 'Confirm removal.' using errcode='22023';end if;
 elsif p_operation='mark' then
  if p_marked is null then raise exception 'Choose mark or clear.' using errcode='22023';end if;
  rank:=dcc_private.tutorial_int(target->'rank',1,20);cap:=dcc_private.tutorial_int(target->'maxRank',1,20);
  if p_marked and (target->>'advancement'='none' or rank>=least(15,cap)) then raise exception 'Ability cannot receive ordinary marks.' using errcode='22023';end if;
  if p_marked and target->>'advancement'='special' and p_confirmed is distinct from true then raise exception 'Confirm special marking condition.' using errcode='22023';end if;
  proposed:=jsonb_set(target,'{marked}',to_jsonb(p_marked));
 elsif p_operation='advance' then
  rank:=dcc_private.tutorial_int(target->'rank',1,20);cap:=dcc_private.tutorial_int(target->'maxRank',1,20);
  if target->>'marked'<>'true' or target->>'advancement'='none' or rank>=least(15,cap) then raise exception 'A qualifying mark is required.' using errcode='22023';end if;
  if p_window is distinct from (case when rank<=4 then 'two-hour' else 'floor-end' end) or p_die is null or p_die not between 1 and 20 or p_modifier is null or p_modifier not between -100 and 100 then raise exception 'Check advancement window and die/modifier.' using errcode='22023';end if;
  new_rank:=case when p_die+p_modifier>=rank then rank+1 else rank end;
  proposed:=target||jsonb_build_object('rank',new_rank,'marked',false,'lastAdvancement',jsonb_build_object('die',p_die,'modifier',p_modifier,'fromRank',rank,'toRank',new_rank,'window',p_window));
 elsif p_operation='cast' then
  if p_confirmed is distinct from true then raise exception 'Confirm casting timing and conditions.' using errcode='22023';end if;
  if target->>'kind'<>'spell' or r.current_segments=0 then raise exception 'Choose a learned Spell and a crawler able to cast.' using errcode='22023';end if;
  if not exists(select 1 from jsonb_array_elements(r.hotlist) entry where entry->>'kind'='skill' and entry->>'target'=p_skill_id) then raise exception 'Prepare this Spell in the Hotlist first.' using errcode='22023';end if;
  if target->>'automation'='tutorial-heal' then perform public.dcc_tutorial_action(r.id,r.version,'cast-heal');return;end if;
  cost:=dcc_private.tutorial_int(target->'manaCost',0,10000);
  if (profile->>'mana')::integer<cost then raise exception 'Insufficient Mana.' using errcode='22023';end if;
  profile:=jsonb_set(profile,'{mana}',to_jsonb((profile->>'mana')::integer-cost));
  proposed:=target;
  rank:=dcc_private.tutorial_int(target->'rank',1,20);cap:=dcc_private.tutorial_int(target->'maxRank',1,20);
  if target->>'advancement'='normal' and rank<least(15,cap) then proposed:=jsonb_set(proposed,'{marked}','true');end if;
 end if;
 if p_operation in ('learn','learn-catalog') then result:=r.learned_skills||jsonb_build_array(proposed);
 else
  for ability in select value from jsonb_array_elements(r.learned_skills) loop
   if ability->>'id'=p_skill_id then if p_operation='remove' then continue;end if;ability:=proposed;end if;
   result:=result||jsonb_build_array(ability);
  end loop;
 end if;
 perform dcc_private.validate_abilities(result);
 update public.dcc_crawlers set learned_skills=result,tutorial_profile=profile,version=gen_random_uuid() where id=r.id;
end $$;
create or replace function public.dcc_loadout_action(p_crawler_id uuid,p_expected_version uuid,p_operation text,p_slot integer default null,p_kind text default null,p_target text default null,p_location text default null,p_bonuses jsonb default null,p_baseline jsonb default null,p_amount bigint default 0)
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
  if p_kind='skill' and not exists(select 1 from jsonb_array_elements(r.learned_skills) ability where ability->>'kind'='spell' and ability->>'id'=p_target) then raise exception 'Spell unavailable.' using errcode='22023';end if;
  entry:=jsonb_build_object('kind',p_kind,'target',p_target);list:=r.hotlist;
  for i in 0..9 loop if list->i=entry then list:=jsonb_set(list,array[i::text],'null');end if;end loop;
  list:=jsonb_set(list,array[(p_slot-1)::text],entry);
  list:=dcc_private.clean_hotlist(list,r.inventory,r.tutorial_profile,r.learned_skills);
  update public.dcc_crawlers set hotlist=list,version=gen_random_uuid() where id=r.id;
 when 'clear' then update public.dcc_crawlers set hotlist=jsonb_set(hotlist,array[(p_slot-1)::text],'null'),version=gen_random_uuid() where id=r.id;
 when 'use' then
  if entry is null or entry='null'::jsonb then raise exception 'Hotlist slot is empty.' using errcode='22023';end if;
  if r.current_segments=0 then raise exception 'Dying crawlers cannot use their HUD.' using errcode='22023';end if;
  if entry->>'kind'='skill' then
   perform public.dcc_skill_action(r.id,r.version,'cast',entry->>'target',null,null,true);
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


-- Seed only previously uninitialized official rows. Do not reset resources,
-- equipment, identity, quick slots, account writeups, or any creation profile.
update public.dcc_crawlers set learned_skills=dcc_private.seed_abilities(tutorial_profile),version=gen_random_uuid() where ruleset='tutorial-v1' and learned_skills is null;
alter table public.dcc_crawlers add constraint dcc_learned_abilities_array check (case when ruleset='tutorial-v1' then case when jsonb_typeof(learned_skills)='array' then jsonb_array_length(learned_skills) between 1 and 200 else false end else learned_skills is null end);
revoke all on function dcc_private.validate_abilities(jsonb),dcc_private.seed_abilities(jsonb),dcc_private.clean_hotlist(jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.dcc_skill_action(uuid,uuid,text,text,jsonb,boolean,boolean,text,integer,integer) from public,anon,authenticated;
grant execute on function public.dcc_skill_action(uuid,uuid,text,text,jsonb,boolean,boolean,text,integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;
