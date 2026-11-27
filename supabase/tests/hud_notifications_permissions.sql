-- Isolated local database only. Every fixture/change rolls back.
begin;
\ir progression_fixture.sql
-- Fixture conversion deliberately changed Health; start these assertions with an empty event log.
delete from public.dcc_table_events;
select set_config('dcc_test.hud_original',(select to_jsonb(c)::text from public.dcc_crawlers c where id=current_setting('dcc_test.pg_id')::uuid),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','c1911111-1111-4111-8111-111111111111',true);
create function pg_temp.hud_act(op text,p jsonb default '{}')returns void language plpgsql as $$begin perform public.dcc_hud_action(current_setting('dcc_test.pg_game')::uuid,op,p);end$$;
create function pg_temp.hud()returns jsonb language sql as $$select public.dcc_hud_snapshot(current_setting('dcc_test.pg_game')::uuid,3)$$;
select pg_temp.pg_assert(pg_temp.hud()->>'unread'='0' and pg_temp.hud()->'timer'='null','Migration must not deliver unsolicited alerts or start a timer.');
select pg_temp.hud_act('broadcast',jsonb_build_object('requestId','e2211111-1111-4111-8111-111111111111','category','Achievement','title','Private achievement','body','For one crawler only.','crawlerId',current_setting('dcc_test.pg_id')));
select pg_temp.pg_assert(pg_temp.hud()->>'unread'='1','GM must receive their own broadcast.');
select pg_temp.hud_act('broadcast',jsonb_build_object('requestId','e2211111-1111-4111-8111-111111111111','category','Achievement','title','Private achievement','body','Retry','crawlerId',current_setting('dcc_test.pg_id')));
select pg_temp.pg_assert(pg_temp.hud()->>'unread'='1','A repeated request must not duplicate a reward alert.');
select set_config('request.jwt.claim.sub','c1933333-3333-4333-8333-333333333333',true);
select pg_temp.pg_assert(pg_temp.hud()->>'unread'='0' and not exists(select 1 from public.dcc_table_events),'Another player can read private event content.');
select pg_temp.pg_error('select pg_temp.hud_act(''broadcast'',''{"requestId":"e2222222-2222-4222-8222-222222222222","category":"Loot","title":"Forged","body":"No"}'')','42501');
select pg_temp.pg_error('select pg_temp.hud_act(''timer-set'',''{"floor":3,"version":null,"seconds":60,"start":true}'')','42501');
select pg_temp.pg_error('update public.dcc_floor_state set remaining=999','42501');
select pg_temp.pg_error('update public.dcc_event_recipients set read_at=now()','42501');
select set_config('request.jwt.claim.sub','c1922222-2222-4222-8222-222222222222',true);
select pg_temp.pg_assert(pg_temp.hud()->>'unread'='1','Target did not receive private alert.');
select set_config('dcc_test.hud_private_seq',pg_temp.hud()->>'head',true);
select pg_temp.hud_act('read',jsonb_build_object('sequence',current_setting('dcc_test.hud_private_seq')));
select pg_temp.pg_assert(pg_temp.hud()->>'unread'='0','Personal read acknowledgement failed.');
select pg_temp.hud_act('read',jsonb_build_object('sequence',current_setting('dcc_test.hud_private_seq')));
select set_config('request.jwt.claim.sub','c1911111-1111-4111-8111-111111111111',true);
select pg_temp.pg_assert(pg_temp.hud()->>'unread'='1','Reading an alert changed another recipient read state.');
select set_config('request.jwt.claim.sub','c1933333-3333-4333-8333-333333333333',true);
select public.dcc_save_profile(1,'Other crawler',current_setting('dcc_test.pg_profile')::jsonb);
select public.dcc_use_crawler_profile(current_setting('dcc_test.pg_game')::uuid,1,(select version from public.dcc_crawler_profiles where slot=1));
select set_config('request.jwt.claim.sub','c1911111-1111-4111-8111-111111111111',true);
select pg_temp.hud_act('broadcast','{"requestId":"e2233333-3333-4333-8333-333333333333","category":"Floor Alert","title":"All Crawlers","body":"Public table alert."}');
-- All current crawler owners receive the broadcast, without receiving earlier private history.
select set_config('request.jwt.claim.sub','c1933333-3333-4333-8333-333333333333',true);
select pg_temp.pg_assert(pg_temp.hud()->>'unread'='1' and jsonb_array_length(pg_temp.hud()->'events')=1,'All Crawlers failed to reach the second player or leaked earlier private history.');
select pg_temp.pg_error('select pg_temp.hud_act(''read'',jsonb_build_object(''sequence'',current_setting(''dcc_test.hud_private_seq'')))','42501');
select set_config('request.jwt.claim.sub','c1911111-1111-4111-8111-111111111111',true);
select set_config('dcc_test.hud_watermark',pg_temp.hud()->>'head',true);
select pg_temp.hud_act('broadcast','{"requestId":"e2244444-4444-4444-8444-444444444444","category":"System AI","title":"Arrived later","body":"Do not mark this read yet."}');
select pg_temp.hud_act('read-all',jsonb_build_object('through',current_setting('dcc_test.hud_watermark')));
select pg_temp.pg_assert(pg_temp.hud()->>'unread'='1','Mark all read swallowed a later arrival.');
select pg_temp.pg_error('select pg_temp.hud_act(''broadcast'',''{"requestId":"e2255555-5555-4555-8555-555555555555","category":"Forged","title":"Bad","body":"Bad"}'')','22023');
select pg_temp.pg_error('select pg_temp.hud_act(''broadcast'',''{"requestId":"e2255555-5555-4555-8555-555555555555","category":"Loot","title":"Bad","body":"Bad","crawlerId":"e2255555-5555-4555-8555-555555555555"}'')','42501');

-- Per-floor state, server deadlines, stale versions and expiry without crawler changes.
select pg_temp.hud_act('timer-set','{"floor":3,"version":null,"seconds":3600,"start":true}');
select pg_temp.pg_assert(pg_temp.hud()#>>'{timer,running}'='true' and (pg_temp.hud()#>>'{timer,deadline}')::timestamptz>clock_timestamp()+interval '59 minutes','Shared running deadline missing.');
select set_config('dcc_test.hud_timer_version',pg_temp.hud()#>>'{timer,version}',true);
select pg_temp.pg_error('select pg_temp.hud_act(''timer-set'',''{"floor":3,"version":null,"seconds":5,"start":false}'')','40001');
select pg_temp.hud_act('timer-pause',jsonb_build_object('floor',3,'version',current_setting('dcc_test.hud_timer_version')));
select pg_temp.pg_assert(pg_temp.hud()#>>'{timer,running}'='false' and (pg_temp.hud()#>>'{timer,remaining}')::integer between 3590 and 3600,'Pause did not freeze remaining time.');
select pg_temp.pg_error('select pg_temp.hud_act(''timer-clear'',jsonb_build_object(''floor'',3,''version'',current_setting(''dcc_test.hud_timer_version'')))','40001');
select pg_temp.hud_act('timer-resume',jsonb_build_object('floor',3,'version',pg_temp.hud()#>>'{timer,version}'));
select pg_temp.hud_act('timer-set','{"floor":6,"version":null,"seconds":7200,"start":false}');
select pg_temp.pg_assert(public.dcc_hud_snapshot(current_setting('dcc_test.pg_game')::uuid,6)#>>'{timer,remaining}'='7200' and pg_temp.hud()#>>'{timer,running}'='true','Different floors share a timer.');
select pg_temp.hud_act('timer-clear',jsonb_build_object('floor',3,'version',pg_temp.hud()#>>'{timer,version}'));
select pg_temp.pg_error('select pg_temp.hud_act(''timer-resume'',jsonb_build_object(''floor'',3,''version'',pg_temp.hud()#>>''{timer,version}''))','22023');
select pg_temp.pg_error('select pg_temp.hud_act(''timer-set'',''{"floor":19,"version":null,"seconds":5,"start":false}'')','22023');
select pg_temp.pg_assert((select to_jsonb(c) from public.dcc_crawlers c where id=current_setting('dcc_test.pg_id')::uuid)=current_setting('dcc_test.hud_original')::jsonb,'HUD operations modified existing crawler data.');
select set_config('request.jwt.claim.sub','c1922222-2222-4222-8222-222222222222',true);
select pg_temp.pg_assert(pg_temp.hud()#>>'{timer,remaining}'='0','Players cannot read the shared timer.');
select set_config('request.jwt.claim.sub','e2299999-9999-4999-8999-999999999999',true);
select pg_temp.pg_error('select pg_temp.hud()','42501');
select pg_temp.pg_assert(not exists(select 1 from public.dcc_table_events) and not exists(select 1 from public.dcc_event_recipients) and not exists(select 1 from public.dcc_floor_state),'Outsider can read HUD data.');

-- Automatic alerts are private, transition-based and part of the successful write.
reset role;
update public.dcc_crawlers set current_segments=3 where id=current_setting('dcc_test.pg_id')::uuid;
select set_config('dcc_test.hud_health_before',(select count(*)::text from public.dcc_table_events where source_key like 'health:%'),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','c1922222-2222-4222-8222-222222222222',true);
select public.dcc_sheet_action(current_setting('dcc_test.pg_id')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.pg_id')::uuid),'damage', '{"parts":[{"type":"Armor Piercing","amount":3}]}');
select pg_temp.pg_assert((select count(*) from public.dcc_table_events where source_key like 'health:%')=current_setting('dcc_test.hud_health_before')::integer+1,'Crossing below 30% did not notify.');
-- Other sheet actions while low must not generate more low-health alerts.
select public.dcc_skill_action(current_setting('dcc_test.pg_id')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.pg_id')::uuid),'mark','streetwise',null,true);
select pg_temp.pg_assert((select count(*) from public.dcc_table_events where source_key like 'health:%')=current_setting('dcc_test.hud_health_before')::integer+1,'Repeated low health spammed alerts.');
select set_config('request.jwt.claim.sub','c1911111-1111-4111-8111-111111111111',true);
select public.dcc_skill_action(current_setting('dcc_test.pg_id')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.pg_id')::uuid),'advance','streetwise',null,null,false,'two-hour',20);
select pg_temp.pg_assert((select count(*) from public.dcc_table_events where source_key like 'skill:%')=1,'Resolved skill did not create one alert.');
select public.dcc_skill_action(current_setting('dcc_test.pg_id')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.pg_id')::uuid),'mark','streetwise',null,true);
select public.dcc_skill_action(current_setting('dcc_test.pg_id')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.pg_id')::uuid),'mark','streetwise',null,false);
select pg_temp.pg_assert((select count(*) from public.dcc_table_events where source_key like 'skill:%')=1,'Simply unmarking a skill created a false advancement alert.');
select public.dcc_advancement_action(current_setting('dcc_test.pg_id')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.pg_id')::uuid),'authorize','{"amount":3,"saferoom":true,"reason":"Table review"}');
select pg_temp.pg_assert((select count(*) from public.dcc_table_events where source_key like 'advancement:%')=1,'Stat authorization did not notify.');
select public.dcc_advancement_action(current_setting('dcc_test.pg_id')::uuid,(select version from public.dcc_crawlers where id=current_setting('dcc_test.pg_id')::uuid),'authorize','{"amount":3,"saferoom":true,"reason":"Same balance"}');
select pg_temp.pg_assert((select count(*) from public.dcc_table_events where source_key like 'advancement:%')=1,'Unchanged authorization spammed alerts.');
select pg_temp.pg_error('select dcc_private.publish_table_event(null,null,null,null,null,null)','42501');
select pg_temp.pg_error('select dcc_private.skill_before_hud(null,null,''advance'')','42501');
reset role;
-- All three automatic event types must have exactly the owner and GM recipients.
select pg_temp.pg_assert(not exists(select 1 from public.dcc_event_recipients r join public.dcc_table_events e on e.sequence=r.event_sequence where e.source_key not like 'broadcast:%' and r.user_id not in ('c1911111-1111-4111-8111-111111111111','c1922222-2222-4222-8222-222222222222')),'Automatic alert leaked to another player.');
-- Bounded cursor pagination returns older history without overlap or payload broadcasts.
do $$begin for i in 1..35 loop perform dcc_private.publish_table_event(current_setting('dcc_test.pg_game')::uuid,array['c1922222-2222-4222-8222-222222222222'::uuid],'System AI','History entry','Text only','page:'||i::text);end loop;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','c1922222-2222-4222-8222-222222222222',true);
select pg_temp.pg_assert(jsonb_array_length(pg_temp.hud()->'events')=30 and (pg_temp.hud()->>'hasMore')::boolean,'History is not paginated.');
select set_config('dcc_test.hud_oldest',pg_temp.hud()#>>'{events,29,sequence}',true);
select pg_temp.pg_assert((public.dcc_hud_snapshot(current_setting('dcc_test.pg_game')::uuid,3,current_setting('dcc_test.hud_oldest')::bigint)#>>'{events,0,sequence}')::bigint<current_setting('dcc_test.hud_oldest')::bigint,'Older history repeats the boundary event.');
select set_config('request.jwt.claim.sub','c1911111-1111-4111-8111-111111111111',true);
do $$begin for i in 1..17 loop perform pg_temp.hud_act('broadcast',jsonb_build_object('requestId',gen_random_uuid(),'category','System AI','title','Rate test','body','Test'));end loop;end$$;
select pg_temp.pg_error('select pg_temp.hud_act(''broadcast'',jsonb_build_object(''requestId'',gen_random_uuid(),''category'',''System AI'',''title'',''Rate test'',''body'',''Test''))','54000');
select 'PASS: HUD notification privacy, read states, idempotence, timer control and automatic events';
rollback;
