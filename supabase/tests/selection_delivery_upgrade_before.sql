-- Run only in an isolated 020 database BEFORE migration 021.
begin;
\ir progression_fixture.sql
update public.dcc_crawlers set
 third_floor='{"reviewed":true,"offers":[],"selected":{"raceId":"human","classId":"fighter","raceName":"Human","className":"Boring Ol’ Fighter","size":4,"move":25,"step":10,"mode":"reconciled","notes":"Already included before delivery menus"}}',
 advancement='{"reconciled":true,"spent":6,"authorized":3,"humanFavor":true}'
where id=current_setting('dcc_test.pg_id')::uuid;
create table dcc_private.selection_upgrade_snapshot as select id,to_jsonb(c)as saved from public.dcc_crawlers c;
create table dcc_private.selection_upgrade_profiles as select id,to_jsonb(p)as saved from public.dcc_crawler_profiles p;
commit;
