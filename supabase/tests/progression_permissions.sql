begin;
\ir progression_fixture.sql
set local role authenticated;
select set_config('request.jwt.claim.sub','c1922222-2222-4222-8222-222222222222',true);
select pg_temp.pg_error('select pg_temp.pg_act(''evidence'',''{"evidence":{"facts":{},"popularity":3,"identityLimits":false}}'')','42501');
select pg_temp.pg_error('select pg_temp.pg_act(''offer'',''{"offers":[]}'')','42501');
select pg_temp.pg_error('update public.dcc_crawlers set progression=''{}''','42501');
select pg_temp.pg_act('draft','{"build":{"kind":"class","earth":false,"name":"Thirty One","description":"Over budget","lines":[{"traitId":"stat","target":"intelligence","quantity":31}]}}');
select pg_temp.pg_error('select pg_temp.pg_act(''approve'',jsonb_build_object(''id'',(select progression#>>''{definitions,0,id}''from public.dcc_crawlers where id=current_setting(''dcc_test.pg_id'')::uuid),''waivers'',''[]''::jsonb))','42501');
select set_config('request.jwt.claim.sub','c1911111-1111-4111-8111-111111111111',true);
select pg_temp.pg_error('select pg_temp.pg_act(''approve'',jsonb_build_object(''id'',(select progression#>>''{definitions,0,id}''from public.dcc_crawlers where id=current_setting(''dcc_test.pg_id'')::uuid),''waivers'',''[]''::jsonb))','22023');
select pg_temp.pg_act('approve',jsonb_build_object('id',(select progression#>>'{definitions,0,id}'from public.dcc_crawlers where id=current_setting('dcc_test.pg_id')::uuid),'waivers','["budget"]'::jsonb));
select pg_temp.pg_error('select pg_temp.pg_act(''offer'',''{"offers":[{"raceId":"bune","classId":"blizzardmancer","waivers":[]}]}'')','22023');
select pg_temp.pg_act('evidence','{"evidence":{"facts":{"achievement:cut":true,"originalSpecies":"cat"},"popularity":3,"identityLimits":false}}');
select pg_temp.pg_act('offer','{"offers":[{"raceId":"bune","classId":"blizzardmancer","waivers":[]}]}');
-- Changed verified history must invalidate an old offer when the owner selects it.
select pg_temp.pg_act('evidence','{"evidence":{"facts":{},"popularity":2,"identityLimits":false}}');
select set_config('request.jwt.claim.sub','c1922222-2222-4222-8222-222222222222',true);
select pg_temp.pg_error('select pg_temp.pg_act(''select'',jsonb_build_object(''offerId'',(select progression#>>''{offers,0,id}''from public.dcc_crawlers where id=current_setting(''dcc_test.pg_id'')::uuid),''choices'',''{}''::jsonb,''split'',''{}''::jsonb,''skip'',''[]''::jsonb))','22023');
select set_config('request.jwt.claim.sub','c1911111-1111-4111-8111-111111111111',true);
select pg_temp.pg_error('select pg_temp.pg_act(''offer'',''{"offers":[{"raceId":"human","classId":"pit-fighter","waivers":[]}]}'')','22023');
select pg_temp.pg_act('reward','{"decision":"already-received"}');
select pg_temp.pg_error('select pg_temp.pg_act(''reward'',''{"decision":"issue-once"}'')','22023');
select pg_temp.pg_act('offer','{"offers":[{"raceId":"human","classId":"pit-fighter","waivers":[]}]}');
select set_config('dcc_test.pg_offer',(select progression#>>'{offers,0,id}'from public.dcc_crawlers where id=current_setting('dcc_test.pg_id')::uuid),true);
select set_config('dcc_test.pg_stale',(select version::text from public.dcc_crawlers where id=current_setting('dcc_test.pg_id')::uuid),true);
-- Individual already-applied Stat grant is skipped, not subtracted or granted twice.
select pg_temp.pg_act('select',jsonb_build_object('offerId',current_setting('dcc_test.pg_offer'),'choices','{}'::jsonb,'split','{}'::jsonb,'skip','["human:stat:strength"]'::jsonb));
select pg_temp.pg_assert((select stat_baseline#>>'{strength,base}'='3'and stat_baseline#>>'{intelligence,base}'='10'and current_segments=0 and tutorial_profile->>'mana'='2'and advancement->>'spent'='0'and third_floor#>>'{selected,raceId}'='human'and progression#>'{selection,skipped}'='["human:stat:strength"]'::jsonb from public.dcc_crawlers where id=current_setting('dcc_test.pg_id')::uuid),'Selection replayed grants or changed resources/point balances.');
select pg_temp.pg_error('select pg_temp.pg_act(''select'',''{"offerId":"anything","choices":{},"split":{},"skip":[]}'')','22023');
select pg_temp.pg_error(format('select public.dcc_progression_action(%L,%L,''draft'',''{"confirmed":true,"reason":"stale"}'')',current_setting('dcc_test.pg_id'),current_setting('dcc_test.pg_stale')),'40001');
select set_config('request.jwt.claim.sub','c1933333-3333-4333-8333-333333333333',true);
select pg_temp.pg_error(format('select public.dcc_progression_action(%L,%L,''draft'',''{"confirmed":true,"reason":"Other owner"}'')',current_setting('dcc_test.pg_id'),current_setting('dcc_test.pg_stale')),'42501');
reset role;
select pg_temp.pg_assert(not has_function_privilege('authenticated','dcc_private.progression_custom(jsonb,jsonb,jsonb)','EXECUTE')and not has_function_privilege('anon','public.dcc_progression_action(uuid,uuid,text,jsonb)','EXECUTE'),'Progression function privileges too broad.');
select 'PASS: progression evidence, budgets, actual GM overrides, reward deduplication, prerequisites, reconciliation, resources, repeat/stale saves and isolation' as result;
rollback;
