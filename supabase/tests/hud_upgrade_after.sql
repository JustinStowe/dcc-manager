do $$begin
 if exists((select kind,id,data from dcc_private.hud_upgrade_snapshot except
  (select 'crawler',id,to_jsonb(c) from public.dcc_crawlers c union all select 'profile',id,to_jsonb(p) from public.dcc_crawler_profiles p))
 union all ((select 'crawler',id,to_jsonb(c) from public.dcc_crawlers c union all select 'profile',id,to_jsonb(p) from public.dcc_crawler_profiles p)
  except select kind,id,data from dcc_private.hud_upgrade_snapshot)) then raise exception 'Upgrade rewrote crawler/profile data or versions.';end if;
 if exists(select 1 from public.dcc_floor_state) or exists(select 1 from public.dcc_table_events) or exists(select 1 from public.dcc_event_recipients) then raise exception 'Upgrade created unsolicited events or timers.';end if;
end$$;
select 'PASS: 021→022 preserved complete crawler/profile rows and created no unsolicited state';
