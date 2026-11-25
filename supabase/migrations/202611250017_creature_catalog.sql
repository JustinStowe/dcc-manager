begin;

create table dcc_private.creature_catalog (
  id text primary key,
  name text not null,
  health_slots integer not null check (health_slots between 1 and 100)
);
revoke all on dcc_private.creature_catalog from public, anon, authenticated;
insert into dcc_private.creature_catalog (id,name,health_slots) values
  ('core-269-1','Bad Llama',3),
  ('core-335-1','Brain Boiler',10),
  ('core-335-2','Bugaboo',10),
  ('core-336-1','City Elves',10),
  ('core-337-1','Village Guard',10),
  ('core-337-2','Grulke',10),
  ('core-338-1','Over City Skyfowl',10),
  ('core-342-1','Dwarven Lift Engineer',10),
  ('core-343-1','Cat Girl',10),
  ('core-344-1','Centurion Skyfowl',13),
  ('core-347-1','Beat Cop',9),
  ('core-348-1','Effective Detective',10),
  ('core-348-2','Mook',10),
  ('core-349-1','Gumshoe',10),
  ('core-349-2','Gun Doll',9),
  ('core-350-1','Torpedo',10),
  ('core-354-1','Songstress',8),
  ('core-356-1','The Divider',13),
  ('core-359-1','Merry Militiaman',10),
  ('core-360-1','Gobblin’ Hog',10),
  ('core-361-1','Krasue',10),
  ('core-361-2','Merry Caroler',10),
  ('core-362-1','Village Guard',10),
  ('core-366-1','Demon',10),
  ('core-368-1','Big Daddy Nick',13),
  ('core-371-1','Shambling Berserker',10),
  ('core-372-1','Rumble Weed',10),
  ('core-372-2','Ruin Flocker',9),
  ('core-373-1','Hobgoblin Mortuarty Assistant',10),
  ('core-378-1','Hobgoblin Undertaker',10),
  ('core-380-1','The Dispenser',13),
  ('core-383-1','Cool Kid',10),
  ('core-383-2','Neo-Maxie-Zoom-Dweebie',10),
  ('core-384-1','Non-Sparkly Vampire',10),
  ('core-384-2','Student Body',10),
  ('core-385-1','Sporto Teen Wolf',10),
  ('core-387-1','Teen Bully',10),
  ('core-390-1','Yakov',13),
  ('core-393-1','Broadside Bootleggers',10),
  ('core-394-1','Elven Enforcer',10),
  ('core-394-2','Hangman’s Hawks',10),
  ('core-395-1','Peregrin Perch Prowlers',10),
  ('core-395-2','Skyfowl Crowcorps',10),
  ('core-396-1','Captain Raptor',10),
  ('core-396-2','Hangman’s Hawks',10),
  ('core-401-1','Fowl Player',18),
  ('core-405-1','City Elf',10),
  ('core-406-1','Night Ray',10),
  ('core-406-2','Scolopendrini',10),
  ('core-407-1','Cyborg Mechanic',10),
  ('core-412-1','Kibril Atheras Darkoak',13),
  ('core-415-1','Former Circus Lemur',8),
  ('core-415-2','Giraffe',10),
  ('core-416-1','Stilt Clown',10),
  ('core-417-1','Fat Clown',9),
  ('core-417-2','Mold Lion',10),
  ('core-418-1','Ogre',10),
  ('core-418-2','Tsarina Signet',13),
  ('core-423-1','Heather the Bear',13),
  ('core-424-1','Ringmaster Grimaldi',23),
  ('core-434-1','Mimic',10),
  ('core-434-2','Drek',6),
  ('core-435-1','Jikininki',10),
  ('core-436-1','Flesher',10),
  ('core-437-1','Grease Gremilin',10),
  ('core-437-2','Shade Gnoll',10),
  ('core-438-1','Hobgoblin Interdictor',10),
  ('core-438-2','Dwarf Employee',10),
  ('core-439-1','Grapple',10),
  ('core-440-1','Station Mimic',24),
  ('core-441-1','War Mage',14),
  ('core-442-1','Mantaur',14),
  ('core-443-1','Krakaren Clone',19),
  ('core-444-1','Pooka',14),
  ('core-447-1','Blister Ghoul',10),
  ('core-448-1','Jikininki',10),
  ('core-448-2','Skegga Union Repair Dwarf',10),
  ('core-449-1','Skegga Repair Dwarf Foredwarf',10),
  ('core-454-1','Superior Forge Sprite',10),
  ('core-455-1','Hector',10),
  ('core-455-2','Switchmaster Scotty',14),
  ('core-459-1','Concierge Wereshark',10),
  ('core-460-1','Charmed Drek',6),
  ('core-460-2','Psycho Sticker',10),
  ('core-465-1','Pebbles',10),
  ('core-466-1','Toothless Nana',10),
  ('core-466-2','Rivet',10),
  ('core-468-1','Penthos',19),
  ('core-471-1','Gray Cornet',10),
  ('core-471-2','Razor Fox',10),
  ('core-472-1','Gross Atomizer',10),
  ('core-472-2','Brain Teaser',10),
  ('core-473-1','Energy Vampire',10),
  ('core-478-1','Revengineer',14),
  ('core-481-1','Babababoon',10),
  ('core-482-1','Bone Collector',10),
  ('core-482-2','Flesher',10),
  ('core-483-1','Grease Gremlin',10),
  ('core-483-2','Harvester',10),
  ('core-488-1','Elder Gremlin',10),
  ('core-489-1','Tigran Warrior',10),
  ('core-490-1','Flavisham the Tinkerer',14),
  ('core-493-1','Cave Mudge Bonker',10),
  ('core-493-2','Cave Mudge Judge',10),
  ('core-494-1','Drake Bitch',10),
  ('core-494-2','Drake Stud',10),
  ('core-495-1','School of Mythfish',10),
  ('core-500-1','King Ghiduckrah',19),
  ('core-503-1','Pooka Goal Digger',10),
  ('core-504-1','Clurichaun Aspirant',10),
  ('core-504-2','Krakaren Crotch Dumpling',1),
  ('core-505-1','Jikininki Custodial Consultant',10),
  ('core-505-2','Pooka Harmacist',10),
  ('core-506-1','Clurichaun Aspirant Super Duper Star',10),
  ('core-510-1','Krakaren Clone',19),
  ('core-513-1','Graffiti Mimic',10),
  ('core-513-2','Gristle Gang Member',10),
  ('core-514-1','Lobe Ganger',10),
  ('core-515-1','Trash Knight',10),
  ('core-515-2','Gelatinous Boob',10),
  ('core-516-1','Tape Head',10),
  ('core-516-2','Blaster Master',10),
  ('core-522-1','More Dread',19),
  ('core-527-1','Bomb Tosser',10),
  ('core-527-2','Mellow Surfer',10),
  ('core-529-1','Giant Frenzied Gerbil',10),
  ('core-530-1','Nerodia Water Snake',10),
  ('core-530-2','Yard Beetle',10),
  ('core-531-1','Yard Mantis',10),
  ('core-531-2','Yard Spider',10),
  ('core-537-1','Roller Derby Jammer',10),
  ('core-537-2','Giant Frenzied Gerbil',10),
  ('core-538-1','Legion, the Feral Rat King',15),
  ('core-541-1','Male Thorny Devil',10),
  ('core-541-2','Thorny Devil Queen',10),
  ('core-542-1','Razor Fox',10),
  ('core-542-2','Pazuzu Punk',10),
  ('core-543-1','Pazuzu Bootlicker',10),
  ('core-543-2','Purifier Vulture',10),
  ('core-543-3','Pistol Pangolin',10),
  ('core-548-1','Razor Fox',10),
  ('core-548-2','Phosphenmenologist',10),
  ('core-549-1','Sangoma',10),
  ('core-550-1','Girtablullu',25),
  ('core-553-1','City Elf Trapper',10),
  ('core-553-2','City Elf Mechanic',10),
  ('core-554-1','Elven Clear-Cutter',10),
  ('core-554-2','Pterolykos Hunter',10),
  ('core-558-1','Pterolykos Elder',10),
  ('core-559-1','Human Swashbuckler',10),
  ('core-559-2','Human Gunslinger',10),
  ('core-560-1','Propper',15),
  ('core-563-1','Pet Ghast',10),
  ('core-563-2','Ghommid',10),
  ('core-564-1','Igneous',10),
  ('core-564-2','Night Elf Hunter',10),
  ('core-564-3','Vampire',10),
  ('core-570-1','Countess Kesla',15),
  ('core-573-1','Big Boy Blue',10),
  ('core-574-1','Concierge Shark',10),
  ('core-574-2','Juvenile Octo-shark',10),
  ('core-575-1','Crocodilian Roid-Soldier',10),
  ('core-575-2','Giant Dragonfish',10),
  ('core-579-1','Crocodilian Mob Boss',10),
  ('core-580-1','Unbound Will, Giant Orca',15),
  ('core-582-1','Lusca, Octo-Shark Brood Mother Queen',25),
  ('core-585-1','Bubble Beluga',10),
  ('core-585-2','Cannonback Tortoise',10),
  ('core-586-1','Pain Amplifier Jellyfish',10),
  ('core-586-2','Pirate',10),
  ('core-592-1','Admiral Stoma',15),
  ('core-595-1','Nude Glaber',10),
  ('core-595-2','Flesh Farrago',10),
  ('core-596-1','Glimmermote Swarm',10),
  ('core-596-2','Pudding Pal',10),
  ('core-597-1','Arachnid Grappler',10),
  ('core-597-2','Arachnid Arcanist',10),
  ('core-598-1','Thing Too Horrible to Name',10),
  ('core-602-1','Kensington',20),
  ('core-605-1','Dirigible Gnome',10),
  ('core-605-2','Frost Maidens',10),
  ('core-606-1','Skyfowl Raiders',10),
  ('core-606-2','Snowgrave',10),
  ('core-607-1','Guard Dwarf',10),
  ('core-612-1','Snow Shifter',15),
  ('core-615-1','Crocodilian Clawpad',10),
  ('core-615-2','Crocodilian Deathroller',10),
  ('core-616-1','Lutin Bounty Hunter',10),
  ('core-617-1','Lutin Priest',10),
  ('core-617-2','Temple Guard',10),
  ('core-622-1','Temple Guardian',20),
  ('core-625-1','Bolt Hawk',10),
  ('core-626-1','Bune Lieutenant',10),
  ('core-626-2','Bune Light Guard',10),
  ('core-627-1','Rainbow Sprite',10),
  ('core-627-2','Ursine Edge Member',10),
  ('core-628-1','Dominic Hawthorne',10),
  ('core-628-2','Whisper',10),
  ('core-632-1','Ancient Cloud Dragon',10),
  ('core-633-1','Doppelgänger Saboteur',10),
  ('core-634-1','Aurion',15),
  ('toolkit-17-1','Rat',1),
  ('toolkit-22-1','Gobblin’ Gators',2),
  ('toolkit-22-2','Gnawtria',3),
  ('toolkit-23-1','Rayzer',3),
  ('toolkit-23-2','Riff Roughers',4),
  ('toolkit-24-1','Scat Thug',3),
  ('toolkit-25-1','Trash Princess',4),
  ('toolkit-31-1','Hide-Hitter Crib Daddy',11),
  ('toolkit-34-1','Barflie',4),
  ('toolkit-35-1','Canidna',3),
  ('toolkit-35-2','Mirror Cat',2),
  ('toolkit-36-1','Pack Rat',2),
  ('toolkit-36-2','Homogenous Humors',3),
  ('toolkit-41-1','The Bar Render',11),
  ('toolkit-44-1','Chilly Goat',4),
  ('toolkit-45-1','Fire-Fighter',3),
  ('toolkit-45-2','Rat Brute',4),
  ('toolkit-46-1','Rat Hooligan',4),
  ('toolkit-46-2','Rat Shaman',5),
  ('toolkit-51-1','MisChief, Leader of the Rat-Kin Horde',11),
  ('toolkit-54-1','Vine Creeper',2),
  ('toolkit-55-1','Giant Spiders',3),
  ('toolkit-55-2','Bad Llama',3),
  ('toolkit-56-1','Slimy Croaker',3),
  ('toolkit-56-2','Literal Murder Hornets',2),
  ('toolkit-63-1','Aranaea Magnus',11),
  ('toolkit-66-1','Chef BoyardOoze',4),
  ('toolkit-66-2','Rat Brute',4),
  ('toolkit-67-1','Rat Shaman',5),
  ('toolkit-68-1','Rat Hooligan',8),
  ('toolkit-73-1','Critical Consensus',11),
  ('toolkit-90-1','Shambling Acid Impaler',6),
  ('toolkit-90-2','Sprites',7),
  ('toolkit-91-1','Canis Knights',5),
  ('toolkit-91-2','Grimes',5),
  ('toolkit-92-1','Trollogs',5),
  ('toolkit-97-1','Dread Wizard Grimblegore',12),
  ('toolkit-100-1','Cocaine Kobold',6),
  ('toolkit-101-1','Danger Dingo',5),
  ('toolkit-101-2','Jacked Kangaroo',8),
  ('toolkit-102-1','Jazmanian Devil',14),
  ('toolkit-102-2','Whambat',3),
  ('toolkit-107-1','Mick Moran, Hulking Crockodilian Chef',12),
  ('toolkit-110-1','Brindle Grub',2),
  ('toolkit-110-2','Cow-Tailed Brindle Grub',3),
  ('toolkit-111-1','Brindled Vespa',8),
  ('toolkit-111-2','Unvaccinated Clurichaun Rev-Up Consultant',3),
  ('toolkit-112-1','Laminak Rev-Up Consultant Manager',6),
  ('toolkit-112-2','Smombie',4),
  ('toolkit-113-1','Pickmees',7),
  ('toolkit-119-1','Krakaren Clone',12),
  ('toolkit-122-1','Dream Eaters',5),
  ('toolkit-123-1','Lost Souls',3),
  ('toolkit-123-2','Mind Horror',4),
  ('toolkit-124-1','Troglodyte Basher',6),
  ('toolkit-129-1','Cardium Clam',12),
  ('toolkit-132-1','Bugaboo Goblin-Napper',6),
  ('toolkit-132-2','Bugaboo Socket-Picker',5),
  ('toolkit-133-1','Screye Drone',7),
  ('toolkit-133-2','Blind Goblin Survivor',4),
  ('toolkit-134-1','Socket-Picker',10),
  ('toolkit-134-2','Spit—Goblin Survivor Who Lives in the Now',6),
  ('toolkit-135-1','Go of the Past',7),
  ('toolkit-139-1','Stiggy, Dungeon Surveillance Architect',10),
  ('toolkit-140-1','Bruiser',5),
  ('toolkit-140-2','Wise-Guy',5),
  ('toolkit-140-3','Bad Llama',3),
  ('toolkit-140-4','Goblin',2),
  ('toolkit-141-1','Goblin Engineer',3),
  ('toolkit-141-2','Goblin Bomb Bard',5),
  ('toolkit-141-3','Goblin Shamanka',7),
  ('toolkit-142-1','Rat',1),
  ('toolkit-142-2','Rot Sticker',1),
  ('toolkit-142-3','Scatterer',1),
  ('toolkit-143-1','Hissing Scatterer',2),
  ('toolkit-143-2','Scatterer Brood Guardian',4),
  ('toolkit-143-3','Brindle Grub',2),
  ('toolkit-143-4','Cow-Tailed Brindle Grub',3),
  ('toolkit-144-1','Brindled Vespa',8),
  ('toolkit-144-2','Kobold',3),
  ('toolkit-144-3','Kobold Rider',5),
  ('toolkit-145-1','Danger Dingo',5),
  ('toolkit-145-2','Rage Elemental',10),
  ('toolkit-146-1','Troglodyte Basher',6),
  ('toolkit-146-2','Troglodyte Pygmy',2),
  ('toolkit-146-3','Troglodyte Virtuoso',4),
  ('toolkit-146-4','Ball of Swine',16),
  ('toolkit-147-1','The Hoarder',11),
  ('toolkit-148-1','Prosperity Prophet',21),
  ('toolkit-149-1','Beloved Mimic',22),
  ('toolkit-150-1','Krakaren Clone',12),
  ('toolkit-151-1','The Juicer',12),
  ('toolkit-151-2','Rakish Werehound Shocker',17),
  ('toolkit-152-1','Ralph the Frenzied Gerbil',12),
  ('par-2-1','Back Nine Battle Baboon',4),
  ('par-2-2','Derrick Qu',10),
  ('par-2-3','General Kong',10),
  ('par-4-1','Back Nine Battle Baboon',4),
  ('par-4-2','Derrick Qu',10),
  ('par-4-3','General Kong',10),
  ('par-15-1','Back Nine Battle Baboon',4),
  ('par-18-1','Derrick Qu',10),
  ('par-26-1','General Kong',10);

drop function public.dcc_encounter_action(uuid,uuid,text,uuid,text,integer,text);
create function public.dcc_encounter_action(
  p_campaign_id uuid, p_expected_version uuid, p_operation text,
  p_participant_id uuid default null, p_name text default null,
  p_initiative integer default null, p_mode text default null,
  p_catalog_id text default null, p_health_slots integer default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  state public.dcc_encounters%rowtype;
  crawler public.dcc_crawlers%rowtype;
  creature dcc_private.creature_catalog%rowtype;
  entry jsonb;
  crawler_entry jsonb;
  updated jsonb;
  next_id uuid;
  current_score integer;
  wrapped boolean := false;
begin
  if auth.uid() is null or p_campaign_id is null or not dcc_private.is_gm(p_campaign_id) then
    raise exception 'Only the campaign GM manages encounters.' using errcode = '42501';
  end if;
  if p_operation is null or p_operation not in ('start','add-crawler','add-monster','assign-creature','monster-health','initiative','remove','next','end') then
    raise exception 'Invalid encounter action.' using errcode = '22023';
  end if;
  perform 1 from public.dcc_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Game unavailable.' using errcode = '42501'; end if;
  select * into state from public.dcc_encounters where campaign_id = p_campaign_id for update;
  if p_operation = 'start' then
    if p_mode is null or p_mode not in ('mob','pvp') then raise exception 'Choose a combat mode.' using errcode = '22023'; end if;
    if found then
      if state.active then raise exception 'End the current encounter first.' using errcode = '22023'; end if;
      if state.version is distinct from p_expected_version then raise exception 'Encounter changed.' using errcode = '40001'; end if;
      update public.dcc_encounters set id = gen_random_uuid(), version = gen_random_uuid(), active = true,
        mode = p_mode, phase = case when p_mode = 'mob' then 'mob-declaration' else null end,
        round = 1, current_participant_id = null, participants = '[]'::jsonb where campaign_id = p_campaign_id;
    else
      if p_expected_version is not null then raise exception 'Encounter changed.' using errcode = '40001'; end if;
      insert into public.dcc_encounters(campaign_id,mode,phase)
        values (p_campaign_id,p_mode,case when p_mode = 'mob' then 'mob-declaration' else null end);
    end if;
    return;
  end if;
  if not found or not state.active then raise exception 'Start an encounter first.' using errcode = '22023'; end if;
  if state.version is distinct from p_expected_version then raise exception 'Encounter changed.' using errcode = '40001'; end if;
  updated := state.participants;

  if p_operation in ('add-crawler','add-monster') then
    if jsonb_array_length(updated) >= 50 then raise exception 'Encounter is full.' using errcode = '22023'; end if;
    if p_operation = 'add-crawler' then
      select * into crawler from public.dcc_crawlers where id = p_participant_id and campaign_id = p_campaign_id;
      if not found or crawler.ruleset <> 'tutorial-v1' then raise exception 'Choose an official crawler in this game.' using errcode = '22023'; end if;
      if exists (select 1 from jsonb_array_elements(updated) e where e->>'id' = p_participant_id::text) then
        raise exception 'Crawler is already in this encounter.' using errcode = '22023';
      end if;
      updated := updated || jsonb_build_array(jsonb_build_object('id',p_participant_id::text,'kind','crawler','name',crawler.name,'initiative',null));
    else
      if state.mode <> 'mob' then raise exception 'PvP contains crawlers only.' using errcode = '22023'; end if;
      select * into creature from dcc_private.creature_catalog where id = p_catalog_id;
      if not found then raise exception 'Choose a creature from the official catalog.' using errcode = '22023'; end if;
      updated := updated || jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'kind','monster','name',creature.name,
        'initiative',null,'catalogId',creature.id,'maxHealthSlots',creature.health_slots,'currentHealthSlots',creature.health_slots));
    end if;
  elsif p_operation in ('assign-creature','monster-health') then
    if p_participant_id is null then raise exception 'Monster unavailable.' using errcode = '22023'; end if;
    select value into entry from jsonb_array_elements(updated) where value->>'id' = p_participant_id::text;
    if entry is null or entry->>'kind' <> 'monster' then raise exception 'Monster unavailable.' using errcode = '22023'; end if;
    if p_operation = 'assign-creature' then
      if entry ? 'catalogId' then raise exception 'Creature write-up already attached.' using errcode = '22023'; end if;
      select * into creature from dcc_private.creature_catalog where id = p_catalog_id;
      if not found then raise exception 'Choose a creature from the official catalog.' using errcode = '22023'; end if;
      entry := entry || jsonb_build_object('name',creature.name,'catalogId',creature.id,
        'maxHealthSlots',creature.health_slots,'currentHealthSlots',creature.health_slots);
    else
      if not (entry ? 'catalogId') or p_health_slots is null or p_health_slots < 0 or
        p_health_slots > (entry->>'maxHealthSlots')::integer then
        raise exception 'Invalid remaining Health Bar slots.' using errcode = '22023';
      end if;
      entry := jsonb_set(entry,'{currentHealthSlots}',to_jsonb(p_health_slots));
    end if;
    updated := '[]'::jsonb;
    for crawler_entry in select value from jsonb_array_elements(state.participants) loop
      updated := updated || jsonb_build_array(case when crawler_entry->>'id' = p_participant_id::text then entry else crawler_entry end);
    end loop;
  elsif p_operation in ('initiative','remove') then
    if p_participant_id is null or not exists (select 1 from jsonb_array_elements(updated) e where e->>'id' = p_participant_id::text) then
      raise exception 'Participant unavailable.' using errcode = '22023';
    end if;
    if p_operation = 'initiative' then
      if state.mode <> 'pvp' or p_initiative is null or p_initiative not between 1 and 10020 then
        raise exception 'Enter a PvP d20 + Dex total from 1 to 10020.' using errcode = '22023';
      end if;
    end if;
    updated := '[]'::jsonb;
    for entry in select value from jsonb_array_elements(state.participants) loop
      if entry->>'id' = p_participant_id::text then
        if p_operation = 'remove' then continue; end if;
        entry := jsonb_set(entry,'{initiative}',to_jsonb(p_initiative));
      end if;
      updated := updated || jsonb_build_array(entry);
    end loop;
  elsif p_operation = 'next' then
    if jsonb_array_length(updated) = 0 then raise exception 'Add a participant first.' using errcode = '22023'; end if;
    if state.mode = 'mob' then
      case state.phase
        when 'mob-declaration' then update public.dcc_encounters set phase = 'crawler-reaction', version = gen_random_uuid() where campaign_id = p_campaign_id;
        when 'crawler-reaction' then update public.dcc_encounters set phase = 'mob-resolution', version = gen_random_uuid() where campaign_id = p_campaign_id;
        when 'mob-resolution' then update public.dcc_encounters set phase = 'crawler-action', version = gen_random_uuid() where campaign_id = p_campaign_id;
        when 'crawler-action' then update public.dcc_encounters set phase = 'cleanup', version = gen_random_uuid() where campaign_id = p_campaign_id;
        when 'cleanup' then
          if state.round >= 100000 then raise exception 'Encounter round limit reached.' using errcode = '22023'; end if;
          update public.dcc_encounters set phase = 'mob-declaration', round = state.round + 1,
            version = gen_random_uuid() where campaign_id = p_campaign_id;
          wrapped := true;
        else raise exception 'Encounter phase unavailable.' using errcode = '22023';
      end case;
    else
      if exists (select 1 from jsonb_array_elements(updated) e where e->'initiative' = 'null'::jsonb) then
        raise exception 'Record fresh initiative for every crawler.' using errcode = '22023';
      end if;
      if state.current_participant_id is null then
        update public.dcc_encounters set current_participant_id = (updated->0->>'id')::uuid,
          version = gen_random_uuid() where campaign_id = p_campaign_id;
        return;
      end if;
      select (value->>'initiative')::integer into current_score from jsonb_array_elements(updated)
        where value->>'id' = state.current_participant_id::text;
      if current_score is null then raise exception 'Encounter turn is out of sync.' using errcode = '22023'; end if;
      select (value->>'id')::uuid into next_id from jsonb_array_elements(updated)
        where (value->>'initiative')::integer < current_score
        order by (value->>'initiative')::integer desc, value->>'id' limit 1;
      if next_id is null then
        if state.round >= 100000 then raise exception 'Encounter round limit reached.' using errcode = '22023'; end if;
        updated := coalesce((select jsonb_agg(value || '{"initiative":null}'::jsonb)
          from jsonb_array_elements(updated)), '[]'::jsonb);
        update public.dcc_encounters set round = state.round + 1, current_participant_id = null,
          participants = updated, version = gen_random_uuid() where campaign_id = p_campaign_id;
        wrapped := true;
      else
        update public.dcc_encounters set current_participant_id = next_id, version = gen_random_uuid()
          where campaign_id = p_campaign_id;
      end if;
    end if;
    if wrapped then
      -- Finish Clean up / the PvP round atomically with each crawler countdown.
      for entry in select value from jsonb_array_elements(updated) where value->>'kind' = 'crawler' loop
        select * into crawler from public.dcc_crawlers where id = (entry->>'id')::uuid and campaign_id = p_campaign_id for update;
        if not found then raise exception 'Encounter crawler unavailable.' using errcode = '22023'; end if;
        if exists (select 1 from jsonb_array_elements(crawler.tracked_effects) effect
          where effect->>'active' = 'true' and effect->'remainingRounds' <> 'null'::jsonb) then
          perform public.dcc_effect_action(crawler.id,crawler.version,'tick','{}'::jsonb);
        end if;
      end loop;
    end if;
    return;
  elsif p_operation = 'end' then
    update public.dcc_encounters set active = false, version = gen_random_uuid() where campaign_id = p_campaign_id;
    return;
  end if;

  if state.mode = 'pvp' then
    select coalesce(jsonb_agg(value order by coalesce((value->>'initiative')::integer,-1) desc, value->>'id'), '[]'::jsonb)
      into updated from jsonb_array_elements(updated);
  end if;
  if state.mode = 'pvp' and state.current_participant_id is not null and
    not exists (select 1 from jsonb_array_elements(updated) e where e->>'id' = state.current_participant_id::text) then
    next_id := null;
  else
    next_id := state.current_participant_id;
  end if;
  update public.dcc_encounters set participants = updated, current_participant_id = next_id,
    version = gen_random_uuid() where campaign_id = p_campaign_id;
end $$;
revoke all on function public.dcc_encounter_action(uuid,uuid,text,uuid,text,integer,text,text,integer) from public,anon,authenticated;
grant execute on function public.dcc_encounter_action(uuid,uuid,text,uuid,text,integer,text,text,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
