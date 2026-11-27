-- Only in an isolated clone containing existing 021 crawlers/profile writeups.
create table dcc_private.hud_upgrade_snapshot as
 select 'crawler' kind,id,to_jsonb(c) data from public.dcc_crawlers c
 union all select 'profile',id,to_jsonb(p) from public.dcc_crawler_profiles p;
do $$begin if not exists(select 1 from dcc_private.hud_upgrade_snapshot where kind='crawler') then raise exception 'Seed an existing crawler before testing the upgrade.';end if;end$$;
