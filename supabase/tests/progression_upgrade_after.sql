-- Run after 019/020 on the same isolated database used for upgrade_before.
do $$begin
 if exists(select 1 from dcc_private.progression_upgrade_snapshot s join public.dcc_crawlers c on c.id=s.id where to_jsonb(c)-'progression'<>s.saved)then raise exception 'Upgrade changed 015/018 crawler data.';end if;
 if exists(select 1 from dcc_private.progression_profile_snapshot s join public.dcc_crawler_profiles p on p.id=s.id where to_jsonb(p)<>s.saved)then raise exception 'Upgrade changed account writeups.';end if;
 if exists(select 1 from public.dcc_crawlers where progression->'selection'<>'null'::jsonb or progression->'offers'<>'[]'::jsonb)then raise exception 'Upgrade created selections or offers.';end if;
end$$;
select 'PASS: actual 018→020 upgrade preserved complete crawler rows, versions, balances, selections and writeups' as result;
-- Remove only these isolated test fixtures through the GM's checked delete.
set role authenticated;
select set_config('request.jwt.claim.sub','c1911111-1111-4111-8111-111111111111',false);
select public.dcc_delete_game(id,name)from public.dcc_campaigns where name='Progression test';
reset role;
drop table dcc_private.progression_upgrade_snapshot,dcc_private.progression_profile_snapshot;
delete from auth.users where id in('c1911111-1111-4111-8111-111111111111','c1922222-2222-4222-8222-222222222222','c1933333-3333-4333-8333-333333333333');
