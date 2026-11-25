-- Run ONLY on an isolated test database after 018, before 019/020.
begin;
\ir progression_fixture.sql
-- Preserve both an already-selected crawler and an unreviewed legacy crawler.
update public.dcc_crawlers set third_floor='{"reviewed":true,"offers":[],"selected":{"raceId":"human","classId":"fighter","raceName":"Human","className":"Boring Ol’ Fighter","size":4,"move":25,"step":10,"mode":"reconciled","notes":"Previously applied benefits"}}',advancement='{"reconciled":true,"spent":6,"authorized":3,"humanFavor":true}'where id=current_setting('dcc_test.pg_id')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub','c1933333-3333-4333-8333-333333333333',true);
select public.dcc_save_profile(1,'Unreviewed',current_setting('dcc_test.pg_profile')::jsonb);
select public.dcc_use_crawler_profile(current_setting('dcc_test.pg_game')::uuid,1,(select version from public.dcc_crawler_profiles where slot=1));
reset role;
update public.dcc_crawlers set third_floor='{"reviewed":false,"offers":[],"selected":null}'where owner_user_id='c1933333-3333-4333-8333-333333333333';
create table dcc_private.progression_upgrade_snapshot as select id,to_jsonb(c)as saved from public.dcc_crawlers c;
create table dcc_private.progression_profile_snapshot as select id,to_jsonb(p)as saved from public.dcc_crawler_profiles p;
commit;
