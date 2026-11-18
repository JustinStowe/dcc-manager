-- Run the complete script as administrator after migrations 001–013. All fixture
-- changes roll back. Any error before the final PASS means verification failed.
begin;
create function pg_temp.expect_skill_error(statement text,expected text) returns void
language plpgsql security invoker as $$
begin
 begin execute statement;
 exception when others then if sqlstate<>expected then raise exception 'Expected %, got %: %',expected,sqlstate,sqlerrm;end if;return;end;
 raise exception 'Unexpected success: %',statement;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('f1111111-1111-1111-1111-111111111111','templates-gm@example.invalid',now()),
 ('f2222222-2222-2222-2222-222222222222','templates-player@example.invalid',now()),
 ('f3333333-3333-3333-3333-333333333333','templates-other@example.invalid',now());
select set_config('dcc_test.s_profile','{"version":1,"pronouns":"","method":"array","initialStats":{"strength":2,"intelligence":6,"constitution":3,"dexterity":5,"charisma":4},"stats":{"strength":{"base":2,"enhanced":2},"intelligence":{"base":6,"enhanced":6},"constitution":{"base":3,"enhanced":3},"dexterity":{"base":5,"enhanced":5},"charisma":{"base":4,"enhanced":4}},"backgrounds":{"childhood":{"category":"childhood-1","skills":["Streetwise","Perception"]},"adolescence":{"category":"adolescence-1","skills":["Fabricate","Tracking"]},"career":{"category":"career-2","skills":["Dagger","Endurance"]},"hobby":{"category":"hobby-8","skills":["Driving","Repair"]}},"combatId":"fire-fingers","notes":{"trauma":"","looseEnds":"","regret":"","gear":""},"mana":6,"favor":1}',true);
select set_config('dcc_test.s_zero','{"strength":0,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0,"dr":0,"evade":0}',true);
create function pg_temp.s_act(op text,slot integer default null,kind text default null,target text default null,place text default null,bonuses jsonb default null,baseline jsonb default null,amount bigint default 0) returns void
language plpgsql security invoker as $$
begin perform public.dcc_loadout_action(current_setting('dcc_test.s_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),op,slot,kind,target,place,bonuses,baseline,amount);end $$;
create function pg_temp.s_inventory(op text,item uuid default null,payload jsonb default null,place text default null) returns void
language plpgsql security invoker as $$
begin perform public.dcc_inventory_action(current_setting('dcc_test.s_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),op,item,payload,place);end $$;
create function pg_temp.s_resource(op text,amount bigint default 0,stats jsonb default null) returns void
language plpgsql security invoker as $$
begin perform public.dcc_tutorial_action(current_setting('dcc_test.s_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),op,amount,stats);end $$;
create function pg_temp.s_skill(op text,skill text default null,definition jsonb default null,marked boolean default null,confirmed boolean default false,advancement_window text default null,die integer default null,modifier integer default 0) returns void
language plpgsql security invoker as $$ begin perform public.dcc_skill_action(current_setting('dcc_test.s_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),op,skill,definition,marked,confirmed,advancement_window,die,modifier);end $$;
create function pg_temp.s_get(skill text) returns jsonb language sql security invoker as $$ select value from public.dcc_crawlers,lateral jsonb_array_elements(learned_skills) where id=current_setting('dcc_test.s_crawler')::uuid and value->>'id'=skill $$;
create function pg_temp.s_assert(ok boolean,message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception '%',message;end if;end $$;
create function pg_temp.s_definition(name text,kind text default 'skill',rank integer default 1,cap integer default 15) returns jsonb language sql as $$ select jsonb_build_object('name',name,'kind',kind,'rank',rank,'maxRank',cap,'stat','intelligence','passive',false,'advancement','normal','manaCost',case when kind='spell' then 2 else null end,'description','Test definition','reference','GM reviewed','damage','','range','') $$;
create function pg_temp.sheet_act(op text,payload jsonb default '{}') returns void language plpgsql security invoker as $$ begin perform public.dcc_sheet_action(current_setting('dcc_test.s_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),op,payload);end $$;
create function pg_temp.fx(op text,payload jsonb default '{}') returns void language plpgsql security invoker as $$ begin perform public.dcc_effect_action(current_setting('dcc_test.s_crawler')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),op,payload);end $$;
create function pg_temp.fx_def(name text,rounds integer default 1) returns jsonb language sql as $$ select jsonb_build_object('name',name,'kind','buff','source','Test spell','notes','Visible notes','active',true,'remainingRounds',rounds,'modifiers',jsonb_build_object('strength',2,'intelligence',2,'constitution',0,'dexterity',0,'charisma',0),'defenses','{"Fire":{"resistant":true,"vulnerable":false,"immune":false}}'::jsonb) $$;
create function pg_temp.tm(op text,definition jsonb default null,policy text default 'refresh',confirmed boolean default false) returns void language plpgsql security invoker as $$ begin
 perform public.dcc_template_action(current_setting('dcc_test.s_game')::uuid,op,nullif(current_setting('dcc_test.tm_id',true),'')::uuid,nullif(current_setting('dcc_test.tm_version',true),'')::uuid,p_definition=>definition,p_policy=>policy,p_confirmed=>confirmed);
end $$;
create function pg_temp.tm_link(kind text,target text,template uuid) returns void language plpgsql security invoker as $$ begin
 perform public.dcc_template_action(current_setting('dcc_test.s_game')::uuid,'link',p_template_id=>template,p_crawler_id=>current_setting('dcc_test.s_crawler')::uuid,p_crawler_version=>(select version from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),p_kind=>kind,p_target=>target);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',true);
select set_config('dcc_test.s_game',public.dcc_host_game('Sheet first game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.s_game')::uuid,'f2222222-2222-2222-2222-222222222222');
select public.dcc_add_player(current_setting('dcc_test.s_game')::uuid,'f3333333-3333-3333-3333-333333333333');
select set_config('dcc_test.s_other_game',public.dcc_host_game('Sheet second game')::text,true);
select public.dcc_add_player(current_setting('dcc_test.s_other_game')::uuid,'f2222222-2222-2222-2222-222222222222');
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
select public.dcc_save_profile(1,'Wizard',current_setting('dcc_test.s_profile')::jsonb);
select set_config('dcc_test.s_profile_version',(select version::text from public.dcc_crawler_profiles where slot=1),true);
select public.dcc_use_crawler_profile(current_setting('dcc_test.s_game')::uuid,1,current_setting('dcc_test.s_profile_version')::uuid);
select public.dcc_use_crawler_profile(current_setting('dcc_test.s_other_game')::uuid,1,current_setting('dcc_test.s_profile_version')::uuid);
select set_config('dcc_test.s_crawler',(select id::text from public.dcc_crawlers where campaign_id=current_setting('dcc_test.s_game')::uuid),true);
select set_config('dcc_test.s_potion',(select inventory->0->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);

-- Players cannot define or link effects, even on their own crawler.
select pg_temp.expect_skill_error('select pg_temp.tm(''add'',pg_temp.fx_def(''Forbidden''))','42501');
select set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',true);
select pg_temp.sheet_act('base-stats','{"bases":{"strength":10,"intelligence":10,"constitution":10,"dexterity":10,"charisma":10}}');
select pg_temp.tm('add',pg_temp.fx_def('Might',2));
select set_config('dcc_test.tm_id',(select id::text from public.dcc_effect_templates where campaign_id=current_setting('dcc_test.s_game')::uuid),true);
select set_config('dcc_test.tm_version',(select version::text from public.dcc_effect_templates where id=current_setting('dcc_test.tm_id')::uuid),true);
select public.dcc_template_action(current_setting('dcc_test.s_other_game')::uuid,'add',p_definition=>pg_temp.fx_def('Foreign',2),p_policy=>'refresh');
select set_config('dcc_test.tm_foreign',(select id::text from public.dcc_effect_templates where campaign_id=current_setting('dcc_test.s_other_game')::uuid),true);
select pg_temp.expect_skill_error('select pg_temp.tm(''add'',pg_temp.fx_def(''Expired'',0))','22023');
select pg_temp.s_skill('learn',definition=>pg_temp.s_definition('Self Might','spell'));
select set_config('dcc_test.tm_spell',(select value->>'id' from public.dcc_crawlers,lateral jsonb_array_elements(learned_skills) where id=current_setting('dcc_test.s_crawler')::uuid and value->>'name'='Self Might'),true);
select pg_temp.expect_skill_error('select pg_temp.tm_link(''spell'',''heal'',current_setting(''dcc_test.tm_id'')::uuid)','22023');
select pg_temp.expect_skill_error('select pg_temp.tm_link(''item'',current_setting(''dcc_test.s_potion''),current_setting(''dcc_test.tm_id'')::uuid)','22023');
select pg_temp.expect_skill_error('select pg_temp.tm_link(''spell'',current_setting(''dcc_test.tm_spell''),current_setting(''dcc_test.tm_foreign'')::uuid)','22023');
select pg_temp.tm_link('spell',current_setting('dcc_test.tm_spell'),current_setting('dcc_test.tm_id')::uuid);
select set_config('request.jwt.claim.sub','f3333333-3333-3333-3333-333333333333',true);
select pg_temp.s_assert(not exists(select 1 from public.dcc_effect_templates),'Unlinked player read another crawler template.');
select pg_temp.expect_skill_error('select pg_temp.s_skill(''cast'',current_setting(''dcc_test.tm_spell''),confirmed=>true)','42501');
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
select pg_temp.s_assert((select count(*)=1 from public.dcc_effect_templates),'Owner cannot read linked template or sees unlinked definitions.');
select pg_temp.expect_skill_error('select pg_temp.tm_link(''spell'',current_setting(''dcc_test.tm_spell''),null)','42501');
select pg_temp.expect_skill_error('select dcc_private.skill_before_templates(null,null,null)','42501');
select pg_temp.expect_skill_error('select dcc_private.inventory_before_templates(null,null,null)','42501');
select pg_temp.expect_skill_error('update public.dcc_effect_templates set repeat_policy=''add''','42501');
-- Unprepared cast leaves the complete row unchanged.
select set_config('dcc_test.tm_before',(select row_to_json(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.expect_skill_error('select pg_temp.s_skill(''cast'',current_setting(''dcc_test.tm_spell''),confirmed=>true)','22023');
select pg_temp.s_assert((select row_to_json(c)::text=current_setting('dcc_test.tm_before') from public.dcc_crawlers c where id=current_setting('dcc_test.s_crawler')::uuid),'Rejected cast changed state.');
select pg_temp.s_act('assign',1,'skill',current_setting('dcc_test.tm_spell'));
select pg_temp.s_skill('cast',current_setting('dcc_test.tm_spell'),confirmed=>true);
select set_config('dcc_test.tm_instance',(select tracked_effects->0->>'id' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.s_assert((select tutorial_profile->>'mana'='4' and jsonb_array_length(tracked_effects)=1 and tracked_effects#>>'{0,templateId}'=current_setting('dcc_test.tm_id') and tracked_effects#>>'{0,templateVersion}'=current_setting('dcc_test.tm_version') and tutorial_profile#>>'{stats,strength,enhanced}'='12' and typed_defenses#>>'{Fire,resistant}'='true' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Cost and effect not saved together.');
select pg_temp.s_assert(pg_temp.s_get(current_setting('dcc_test.tm_spell'))->>'marked'='true','Cast did not apply ordinary mark.');
-- Hotlist uses the same atomic cast path, refreshing rather than duplicating.
select set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',true);
select pg_temp.fx('tick');select pg_temp.fx('tick');
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
select pg_temp.s_act('use',1);
select pg_temp.s_assert((select tutorial_profile->>'mana'='2' and jsonb_array_length(tracked_effects)=1 and tracked_effects->0->>'id'=current_setting('dcc_test.tm_instance') from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Hotlist double-applied or bypassed refresh.');
-- GM template changes affect future uses only and invalidate open crawler editors.
select set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',true);
select set_config('dcc_test.tm_stale',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.tm('edit',pg_temp.fx_def('Might revised',4),'replace');
select pg_temp.s_assert((select tracked_effects#>>'{0,name}'='Might' and version::text<>current_setting('dcc_test.tm_stale') from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Template edit rewrote active snapshot or missed invalidation.');
select pg_temp.expect_skill_error('select pg_temp.tm(''edit'',pg_temp.fx_def(''Stale''))','40001');
select set_config('dcc_test.tm_version',(select version::text from public.dcc_effect_templates where id=current_setting('dcc_test.tm_id')::uuid),true);
select pg_temp.sheet_act('mana','{"value":10}');
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
select pg_temp.expect_skill_error(format('select public.dcc_skill_action(%L,%L,''cast'',%L,p_confirmed=>true)',current_setting('dcc_test.s_crawler'),current_setting('dcc_test.tm_stale'),current_setting('dcc_test.tm_spell')),'40001');
select pg_temp.s_skill('cast',current_setting('dcc_test.tm_spell'),confirmed=>true);
select pg_temp.s_assert((select jsonb_array_length(tracked_effects)=1 and tracked_effects->0->>'id'<>current_setting('dcc_test.tm_instance') and tracked_effects#>>'{0,name}'='Might revised' and tracked_effects#>>'{0,remainingRounds}'='4' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Replace did not replace identity and definition.');
-- Custom item last-copy use applies its captured template even after link cleanup.
select set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',true);
select pg_temp.tm('edit',pg_temp.fx_def('Might revised',4),'add');
select set_config('dcc_test.tm_version',(select version::text from public.dcc_effect_templates where id=current_setting('dcc_test.tm_id')::uuid),true);
select pg_temp.s_inventory('add',payload=>'{"name":"Might tonic","kind":"consumable","quantity":1,"notes":"Custom","gearSlot":"none","effect":"manual"}');
select set_config('dcc_test.tm_item',(select value->>'id' from public.dcc_crawlers,lateral jsonb_array_elements(inventory) where id=current_setting('dcc_test.s_crawler')::uuid and value->>'name'='Might tonic'),true);
select pg_temp.tm_link('item',current_setting('dcc_test.tm_item'),current_setting('dcc_test.tm_id')::uuid);
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
select pg_temp.s_inventory('consume',current_setting('dcc_test.tm_item')::uuid);
select pg_temp.s_assert((select jsonb_array_length(tracked_effects)=2 and not(effect_links?('item:'||current_setting('dcc_test.tm_item'))) and not exists(select 1 from jsonb_array_elements(inventory) e where e->>'id'=current_setting('dcc_test.tm_item')) and tutorial_profile#>>'{stats,strength,enhanced}'='14' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Last-copy use lost effect, failed stack, or left a dangling link.');
-- An effect limit failure must roll back cost, marks, version and all projections.
reset role;
update public.dcc_crawlers set tracked_effects=(select jsonb_agg(pg_temp.fx_def('Filler',null)||jsonb_build_object('id','filler-'||i,'active',false)) from generate_series(1,100) i) where id=current_setting('dcc_test.s_crawler')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
select set_config('dcc_test.tm_before',(select row_to_json(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.expect_skill_error('select pg_temp.s_skill(''cast'',current_setting(''dcc_test.tm_spell''),confirmed=>true)','22023');
select pg_temp.s_assert((select row_to_json(c)::text=current_setting('dcc_test.tm_before') from public.dcc_crawlers c where id=current_setting('dcc_test.s_crawler')::uuid),'Effect-limit failure spent Mana or changed version.');
-- Same rollback guarantee for inventory quantity, including a last copy.
select set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',true);
select pg_temp.s_inventory('add',payload=>'{"name":"Overflow tonic","kind":"consumable","quantity":1,"notes":"Custom","gearSlot":"none","effect":"manual"}');
select set_config('dcc_test.tm_item',(select value->>'id' from public.dcc_crawlers,lateral jsonb_array_elements(inventory) where id=current_setting('dcc_test.s_crawler')::uuid and value->>'name'='Overflow tonic'),true);
select pg_temp.tm_link('item',current_setting('dcc_test.tm_item'),current_setting('dcc_test.tm_id')::uuid);
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
select set_config('dcc_test.tm_before',(select row_to_json(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.expect_skill_error('select pg_temp.s_inventory(''consume'',current_setting(''dcc_test.tm_item'')::uuid)','22023');
select pg_temp.s_assert((select row_to_json(c)::text=current_setting('dcc_test.tm_before') from public.dcc_crawlers c where id=current_setting('dcc_test.s_crawler')::uuid),'Effect-limit failure spent inventory or deleted its link.');
-- Derived-stat overflow also rolls the resource write back.
reset role;
update public.dcc_crawlers set tracked_effects='[]'::jsonb,inventory=inventory||jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'name','Overflow test hat','kind','gear','quantity',1,'notes','','gearSlot','head','location','head','effect','manual','bonuses','{"strength":1,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0,"dr":0,"evade":0}'::jsonb)) where id=current_setting('dcc_test.s_crawler')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',true);
select pg_temp.tm('edit',pg_temp.fx_def('Overflow',2)||'{"modifiers":{"strength":10000,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0}}'::jsonb,'add');
select set_config('dcc_test.tm_version',(select version::text from public.dcc_effect_templates where id=current_setting('dcc_test.tm_id')::uuid),true);
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
select set_config('dcc_test.tm_before',(select row_to_json(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.s_crawler')::uuid),true);
select pg_temp.expect_skill_error('select pg_temp.s_skill(''cast'',current_setting(''dcc_test.tm_spell''),confirmed=>true)','22023');
select pg_temp.s_assert((select row_to_json(c)::text=current_setting('dcc_test.tm_before') from public.dcc_crawlers c where id=current_setting('dcc_test.s_crawler')::uuid),'Stat-overflow failure spent Mana or changed projections.');
-- Deleting a template removes links but does not remove effect snapshots.
reset role;
update public.dcc_crawlers set tracked_effects=jsonb_build_array(pg_temp.fx_def('Saved snapshot',2)||jsonb_build_object('id','snapshot','templateId',current_setting('dcc_test.tm_id'),'templateVersion',current_setting('dcc_test.tm_version'))) where id=current_setting('dcc_test.s_crawler')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',true);
select pg_temp.tm('remove',confirmed=>true);
select pg_temp.s_assert((select effect_links='{}'::jsonb and tracked_effects#>>'{0,name}'='Saved snapshot' from public.dcc_crawlers where id=current_setting('dcc_test.s_crawler')::uuid),'Template removal deleted effects or left links.');
select set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',true);
select pg_temp.s_assert((select tracked_effects='[]'::jsonb and effect_links='{}'::jsonb and tutorial_profile->>'mana'='6' and current_segments=10 from public.dcc_crawlers where campaign_id=current_setting('dcc_test.s_other_game')::uuid),'Template use leaked across game instances.');
select pg_temp.s_assert((select version::text=current_setting('dcc_test.s_profile_version') from public.dcc_crawler_profiles where slot=1),'Template use changed account writeup.');
reset role;
select 'PASS: templates, RLS, protected automation, repeat policies, atomic spell/item/Hotlist use, versions, cleanup and isolation' as result;
rollback;
