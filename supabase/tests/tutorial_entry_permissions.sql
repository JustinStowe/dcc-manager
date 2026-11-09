begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('c1111111-1111-1111-1111-111111111111','tutorial-gm@example.invalid',now()),
 ('c2222222-2222-2222-2222-222222222222','tutorial-alice@example.invalid',now()),
 ('c3333333-3333-3333-3333-333333333333','tutorial-bob@example.invalid',now()),
 ('c4444444-4444-4444-4444-444444444444','tutorial-legacy@example.invalid',now()),
 ('c5555555-5555-5555-5555-555555555555','tutorial-outsider@example.invalid',now());
select set_config('dcc_test.profile',$profile${"version":1,"pronouns":"","method":"array","initialStats":{"strength":2,"intelligence":6,"constitution":3,"dexterity":5,"charisma":4},"stats":{"strength":{"base":2,"enhanced":2},"intelligence":{"base":6,"enhanced":6},"constitution":{"base":3,"enhanced":3},"dexterity":{"base":5,"enhanced":5},"charisma":{"base":4,"enhanced":4}},"backgrounds":{"childhood":{"category":"childhood-1","skills":["Streetwise","Perception"]},"adolescence":{"category":"adolescence-1","skills":["Fabricate","Tracking"]},"career":{"category":"career-2","skills":["Dagger","Endurance"]},"hobby":{"category":"hobby-8","skills":["Driving","Repair"]}},"combatId":"longsword","notes":{"trauma":"","looseEnds":"","regret":"","gear":""},"mana":6,"favor":1}$profile$,true);
set local role authenticated;
select set_config('request.jwt.claim.sub','c1111111-1111-1111-1111-111111111111',true);
select set_config('dcc_test.game',public.dcc_host_game('Tutorial permission test')::text,true);
select set_config('dcc_test.code',public.dcc_host_settings(current_setting('dcc_test.game')::uuid)->>'code',true);
select set_config('request.jwt.claim.sub','c2222222-2222-2222-2222-222222222222',true);
select public.dcc_join_game(current_setting('dcc_test.code'));
do $$ declare p jsonb:=current_setting('dcc_test.profile')::jsonb;k text;s jsonb:='{}';begin
 foreach k in array array['strength','intelligence','constitution','dexterity','charisma'] loop s:=s||jsonb_build_object(k,6);end loop;
 p:=jsonb_set(p,'{initialStats}',s);
 begin perform public.dcc_create_tutorial(current_setting('dcc_test.game')::uuid,auth.uid(),'Forged array',p);raise exception 'Forged starting array accepted.';exception when invalid_parameter_value then null;end;
end $$;
select public.dcc_create_tutorial(current_setting('dcc_test.game')::uuid,auth.uid(),'Alice',current_setting('dcc_test.profile')::jsonb);
select set_config('dcc_test.alice',(select id::text from public.dcc_crawlers where name='Alice'),true);
do $$ declare r public.dcc_crawlers%rowtype; old_version uuid; begin
 select * into r from public.dcc_crawlers where name='Alice';
 if r.current_segments<>10 or r.max_segments<>10 or r.constitution<>3 or r.crawler_number<>500000 or r.tutorial_profile->>'mana'<>'6' or r.tutorial_profile->>'favor'<>'1' then raise exception 'Wrong starting state.'; end if;
 old_version:=r.version;
 begin perform public.dcc_create_tutorial(r.campaign_id,auth.uid(),'Replacement',current_setting('dcc_test.profile')::jsonb);raise exception 'Second crawler replaced the first.';exception when unique_violation then null;end;
 begin perform public.dcc_create_tutorial(r.campaign_id,auth.uid(),'Replacement',current_setting('dcc_test.profile')::jsonb,null,r.id,r.version,10);raise exception 'Owner performed GM conversion.';exception when insufficient_privilege then null;end;
 perform public.dcc_tutorial_action(r.id,r.version,'damage',1);
 begin perform public.dcc_tutorial_action(r.id,old_version,'damage',1);raise exception 'Stale write accepted.';exception when serialization_failure then null;end;
 select * into r from public.dcc_crawlers where id=r.id;
 perform public.dcc_tutorial_action(r.id,r.version,'damage',1);
 select * into r from public.dcc_crawlers where id=r.id;
 if r.current_segments<>10 then raise exception 'Small hits accumulated.';end if;
 perform public.dcc_tutorial_action(r.id,r.version,'damage',4);
 select * into r from public.dcc_crawlers where id=r.id;
 if r.current_segments<>8 then raise exception 'Wrong damage conversion.';end if;
 perform public.dcc_tutorial_action(r.id,r.version,'cast-heal');
 select * into r from public.dcc_crawlers where id=r.id;
 if r.current_segments<>10 or r.tutorial_profile->>'mana'<>'4' then raise exception 'Heal was not atomic.';end if;
 perform public.dcc_tutorial_action(r.id,r.version,'mana-spend',4);
 select * into r from public.dcc_crawlers where id=r.id;
 begin perform public.dcc_tutorial_action(r.id,r.version,'cast-heal');raise exception 'Heal accepted insufficient Mana.';exception when invalid_parameter_value then null;end;
 perform public.dcc_tutorial_action(r.id,r.version,'mana-recover',100);
 select * into r from public.dcc_crawlers where id=r.id;
 if r.tutorial_profile->>'mana'<>'6' then raise exception 'Mana exceeded maximum.';end if;
 perform public.dcc_tutorial_action(r.id,r.version,'favor-spend');
 select * into r from public.dcc_crawlers where id=r.id;
 begin perform public.dcc_tutorial_action(r.id,r.version,'favor-spend');raise exception 'Favor underflow.';exception when invalid_parameter_value then null;end;
 begin perform public.dcc_tutorial_action(r.id,r.version,'favor-award',5);raise exception 'Owner awarded Favor.';exception when insufficient_privilege then null;end;
 begin perform public.dcc_change_health(r.id,r.version,10);raise exception 'Legacy health bypass.';exception when insufficient_privilege then null;end;
 begin perform public.dcc_update_stats(r.id,r.version,20,20);raise exception 'Legacy stat bypass.';exception when insufficient_privilege then null;end;
 begin perform public.dcc_tutorial_action(r.id,r.version,'stats',0,r.tutorial_profile->'stats');raise exception 'Player edited stats.';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','c3333333-3333-3333-3333-333333333333',true);
select public.dcc_join_game(current_setting('dcc_test.code'));
select set_config('dcc_test.roll',public.dcc_tutorial_roll(current_setting('dcc_test.game')::uuid,auth.uid())::text,true);
do $$ declare roll jsonb:=current_setting('dcc_test.roll')::jsonb;p jsonb:=current_setting('dcc_test.profile')::jsonb;k text;s jsonb:='{}';begin
 if public.dcc_tutorial_roll(current_setting('dcc_test.game')::uuid,auth.uid()) is distinct from roll then raise exception 'Roll changed on retry.';end if;
 foreach k in array array['strength','intelligence','constitution','dexterity','charisma'] loop s:=s||jsonb_build_object(k,jsonb_build_object('base',roll#>array['scores',k],'enhanced',roll#>array['scores',k]));end loop;
 p:=p||jsonb_build_object('method','rolled','initialStats',roll->'scores','stats',s,'mana',roll#>'{scores,intelligence}');
 begin perform public.dcc_create_tutorial(current_setting('dcc_test.game')::uuid,auth.uid(),'Forged',p,gen_random_uuid());raise exception 'Forged roll ticket accepted.';exception when invalid_parameter_value then null;end;
 perform public.dcc_create_tutorial(current_setting('dcc_test.game')::uuid,auth.uid(),'Bob',p,(roll->>'id')::uuid);
 if (select crawler_number from public.dcc_crawlers where name='Bob')<>500001 then raise exception 'Crawler numbering is not unique/sequential.';end if;
 if exists(select 1 from public.dcc_crawlers where name='Alice') then raise exception 'Other player profile leaked.';end if;
end $$;
select set_config('request.jwt.claim.sub','c1111111-1111-1111-1111-111111111111',true);
do $$ declare r public.dcc_crawlers%rowtype;s jsonb;begin
 select * into r from public.dcc_crawlers where name='Alice';
 begin perform public.dcc_update_stats(r.id,r.version,20,20);raise exception 'GM legacy stat bypass.';exception when insufficient_privilege then null;end;
 perform public.dcc_tutorial_action(r.id,r.version,'damage',4);
 select * into r from public.dcc_crawlers where id=r.id;
 s:=jsonb_set(jsonb_set(r.tutorial_profile->'stats','{constitution,enhanced}','10'),'{intelligence,enhanced}','2');
 perform public.dcc_tutorial_action(r.id,r.version,'stats',0,s);
 select * into r from public.dcc_crawlers where id=r.id;
 if r.current_segments<>8 or r.max_segments<>10 or r.tutorial_profile->>'mana'<>'2' then raise exception 'Stat edit healed slots or failed to clamp Mana.';end if;
 begin perform public.dcc_tutorial_action(r.id,r.version,'number',0,null,500001);raise exception 'Duplicate number accepted.';exception when unique_violation then null;end;
 perform public.dcc_tutorial_action(r.id,r.version,'favor-award',3);
 select * into r from public.dcc_crawlers where id=r.id;
 if r.tutorial_profile->>'favor'<>'3' then raise exception 'GM Favor award failed.';end if;
 perform public.dcc_tutorial_action(r.id,r.version,'damage',1000);
 select * into r from public.dcc_crawlers where id=r.id;
 begin perform public.dcc_tutorial_action(r.id,r.version,'cast-heal');raise exception 'Dying self-cast accepted.';exception when invalid_parameter_value then null;end;
 perform public.dcc_tutorial_action(r.id,r.version,'heal-slots',2);
 select * into r from public.dcc_crawlers where id=r.id;
 if r.current_segments<>2 then raise exception 'Healing received at zero failed.';end if;
end $$;
select public.dcc_add_player(current_setting('dcc_test.game')::uuid,'c4444444-4444-4444-4444-444444444444');
select public.dcc_create_crawler(current_setting('dcc_test.game')::uuid,'c4444444-4444-4444-4444-444444444444','Old prototype',10,10,0);
select set_config('dcc_test.legacy',(select id::text from public.dcc_crawlers where name='Old prototype'),true);
do $$ declare r public.dcc_crawlers%rowtype;begin
 select * into r from public.dcc_crawlers where name='Old prototype';
 begin perform public.dcc_create_tutorial(r.campaign_id,r.owner_user_id,r.name,current_setting('dcc_test.profile')::jsonb,null,r.id,r.version,5);raise exception 'Conversion revived zero health.';exception when invalid_parameter_value then null;end;
 perform public.dcc_create_tutorial(r.campaign_id,r.owner_user_id,r.name,current_setting('dcc_test.profile')::jsonb,null,r.id,r.version,0);
 select * into r from public.dcc_crawlers where id=r.id;
 if r.current_segments<>0 or r.ruleset<>'tutorial-v1' or r.crawler_number<>500002 then raise exception 'Conversion did not preserve identity/zero state.';end if;
end $$;
select set_config('request.jwt.claim.sub','c5555555-5555-5555-5555-555555555555',true);
do $$ begin
 if exists(select 1 from public.dcc_crawlers) then raise exception 'Non-member read crawlers.';end if;
 begin perform public.dcc_tutorial_roll(current_setting('dcc_test.game')::uuid,auth.uid());raise exception 'Outsider rolled stats.';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$begin
 if not exists(select 1 from dcc_private.tutorial_legacy_archive where crawler_id=current_setting('dcc_test.legacy')::uuid and snapshot->>'current_segments'='0' and snapshot->>'constitution'='10') then raise exception 'Original prototype was not archived.';end if;
 if has_table_privilege('authenticated','dcc_private.tutorial_legacy_archive','SELECT') then raise exception 'Archive exposed to users.';end if;
end $$;
rollback;
select 'PASS: Tutorial database assertions completed; fixtures rolled back.' as result;
