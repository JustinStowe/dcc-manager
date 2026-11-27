begin;
\ir progression_fixture.sql
set local role authenticated;
select set_config('request.jwt.claim.sub','c1911111-1111-4111-8111-111111111111',true);
create function pg_temp.sq(q jsonb default '{}')returns jsonb language sql as $$select public.dcc_safe_room_snapshot(current_setting('dcc_test.pg_id')::uuid,q)$$;
do $$declare i integer;box jsonb;begin
 for i in 1..36 loop
  box:=null;
  if i%6=0 then box:=jsonb_build_object('tier',(array['bronze','silver','gold','platinum','legendary','celestial'])[i/6],'name','Box '||i,'category','Test','flavor','','aiNote','','guideNote','','voteLocked',false,'sourceAchievementId',null,'items',jsonb_build_array(jsonb_build_object('name','Rope','kind','gear','quantity',1,'notes','','gearSlot','none','effect','manual','bonuses','{"strength":0,"intelligence":0,"constitution":0,"dexterity":0,"charisma":0,"dr":0,"evade":0}'::jsonb)));end if;
  perform public.dcc_safe_room_action(current_setting('dcc_test.pg_id')::uuid,'award',jsonb_build_object('requestId',gen_random_uuid(),'reviewed',true,'existing',false,'source','manual',
   'achievement',jsonb_build_object('title','Achievement '||i,'floor',1+i%8,'trigger',case when i=2 then 'Needle in history' else 'Table trigger' end,'description','System commentary','rewardText',''), 'box',box));
 end loop;
end$$;
select pg_temp.pg_assert(jsonb_array_length(pg_temp.sq()->'achievements')=30 and pg_temp.sq()->>'achievementMore'='true','Achievement history is not bounded.');
select pg_temp.pg_assert(jsonb_array_length(pg_temp.sq(jsonb_build_object('achievementBefore',pg_temp.sq()#>>'{achievements,29,sequence}'))->'achievements')=6,'Older achievement page is incomplete or overlaps.');
select pg_temp.pg_assert(pg_temp.sq('{"search":"Needle"}')#>>'{achievements,0,title}'='Achievement 2','Search did not reach older history outside the first page.');
select pg_temp.pg_assert(jsonb_array_length(pg_temp.sq('{"search":"%"}')->'achievements')=0,'Search treated a literal percent as a wildcard.');
select pg_temp.pg_assert(jsonb_array_length(pg_temp.sq('{"floor":"4+"}')->'achievements')=22,'Floor 4+ grouping is incorrect.');
select pg_temp.pg_assert(jsonb_array_length(pg_temp.sq('{"status":"with-box"}')->'achievements')=6,'With Box filter is incorrect.');
select pg_temp.pg_assert(jsonb_array_length(pg_temp.sq('{"tier":"silver"}')->'boxes')=1,'Tier filter is incorrect.');
select set_config('dcc_test.sq_celestial',pg_temp.sq('{"tier":"celestial"}')#>>'{boxes,0,id}',true);
select pg_temp.pg_assert(pg_temp.sq(jsonb_build_object('tier','bronze','boxId',current_setting('dcc_test.sq_celestial')))#>>'{selectedBox,tier}'='celestial','A linked box cannot be opened outside the active filters.');
select set_config('dcc_test.sq_head',pg_temp.sq()->>'achievementHead',true);
select public.dcc_safe_room_action(current_setting('dcc_test.pg_id')::uuid,'award',jsonb_build_object('requestId',gen_random_uuid(),'reviewed',true,'existing',false,'source','manual','box',null,'achievement',jsonb_build_object('title','Arrived later','floor',1,'trigger','Later','description','Fresh','rewardText','')));
select public.dcc_safe_room_action(current_setting('dcc_test.pg_id')::uuid,'read-all',jsonb_build_object('through',current_setting('dcc_test.sq_head')));
select pg_temp.pg_assert(pg_temp.sq()->>'unreadAchievements'='1' and pg_temp.sq('{"status":"unread"}')#>>'{achievements,0,title}'='Arrived later','Mark All Read swallowed a new arrival.');
select set_config('request.jwt.claim.sub','c1922222-2222-4222-8222-222222222222',true);
select pg_temp.pg_assert(pg_temp.sq()->>'unreadAchievements'='37','GM read state leaked into the owner account.');
select pg_temp.pg_assert(not exists(select 1 from public.dcc_loot_box_items),'Direct reads exposed six sealed boxes.');
select 'PASS: complete-history search, floor/status/tier filters, pagination, deep links and per-user read watermarks';
rollback;
