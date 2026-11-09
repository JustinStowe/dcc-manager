-- Read-only. Run in the Supabase SQL Editor for the same project referenced
-- by NEXT_PUBLIC_SUPABASE_URL. This does not create or modify any object.
select
  to_regclass('public.dcc_campaigns') as campaigns_table,
  to_regclass('public.dcc_campaign_members') as members_table,
  to_regclass('public.dcc_crawlers') as crawlers_table,
  to_regprocedure('public.dcc_host_game(text)') as host_function,
  to_regprocedure('public.dcc_join_game(text)') as join_function,
  to_regprocedure('public.dcc_host_settings(uuid)') as host_settings_function,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'dcc_campaigns'
      and column_name = 'accepting_players'
  ) as has_lobby_column;
