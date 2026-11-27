do $$begin
 if exists(with current_rows as (
  select 'crawler' kind,id::text record_id,to_jsonb(c) data from public.dcc_crawlers c
  union all select 'profile',id::text,to_jsonb(p) from public.dcc_crawler_profiles p
  union all select 'timer',campaign_id::text||':'||floor::text,to_jsonb(f) from public.dcc_floor_state f
  union all select 'event',sequence::text,to_jsonb(e) from public.dcc_table_events e
  union all select 'recipient',event_sequence::text||':'||user_id::text,to_jsonb(r) from public.dcc_event_recipients r
 ) (select * from current_rows except select * from dcc_private.safe_room_upgrade_snapshot)
 union all (select * from dcc_private.safe_room_upgrade_snapshot except select * from current_rows)) then raise exception '023 modified existing crawler/profile or Phase 1 data.';end if;
 if exists(select 1 from public.dcc_loot_boxes) or exists(select 1 from public.dcc_achievements) or exists(select 1 from public.dcc_safe_room_access) or exists(select 1 from public.dcc_incentive_reviews) then raise exception '023 granted unsolicited rewards or permissions.';end if;
end$$;
select 'PASS: 022→023 preserves complete crawler/profile rows, timers, notifications and read states';
