-- An isolated 022 clone with an existing crawler/profile; never a hosted game.
do $$declare c public.dcc_crawlers%rowtype;gm uuid;begin
 select * into c from public.dcc_crawlers limit 1;
 if c.id is null then raise exception 'Seed an existing crawler before testing the upgrade.';end if;
 select gm_user_id into gm from public.dcc_campaigns where id=c.campaign_id;
 perform set_config('request.jwt.claim.sub',gm::text,false);
 perform public.dcc_hud_action(c.campaign_id,'broadcast',jsonb_build_object('requestId',gen_random_uuid(),'category','System AI','title','Existing table history','body','Synthetic preservation fixture.'));
 perform public.dcc_hud_action(c.campaign_id,'timer-set',jsonb_build_object('floor',c.dungeon_floor,'version',(select version from public.dcc_floor_state where campaign_id=c.campaign_id and floor=c.dungeon_floor),'seconds',3600,'start',false));
end$$;
create table dcc_private.safe_room_upgrade_snapshot as
 select 'crawler' kind,id::text record_id,to_jsonb(c) data from public.dcc_crawlers c
 union all select 'profile',id::text,to_jsonb(p) from public.dcc_crawler_profiles p
 union all select 'timer',campaign_id::text||':'||floor::text,to_jsonb(f) from public.dcc_floor_state f
 union all select 'event',sequence::text,to_jsonb(e) from public.dcc_table_events e
 union all select 'recipient',event_sequence::text||':'||user_id::text,to_jsonb(r) from public.dcc_event_recipients r;
