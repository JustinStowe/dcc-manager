-- Run after 021 in the isolated database prepared by the companion script.
do $$begin
 if not exists(select 1 from dcc_private.selection_upgrade_snapshot)then raise exception 'Missing upgrade fixtures';end if;
 if exists(select 1 from dcc_private.selection_upgrade_snapshot s left join public.dcc_crawlers c on c.id=s.id where c.id is null or(to_jsonb(c)-'selection_menus')is distinct from s.saved or c.selection_menus<>'{"deliveries":[]}'::jsonb)then raise exception '021 changed existing crawler data or pushed an unsolicited menu';end if;
 if exists(select 1 from dcc_private.selection_upgrade_profiles s left join public.dcc_crawler_profiles p on p.id=s.id where to_jsonb(p)is distinct from s.saved)then raise exception '021 changed account writeups';end if;
end$$;
select 'PASS: 020 to 021 preserves every existing crawler field/version, 015 point balances, 018/019 selections and account writeups; no automatic grants or deliveries' as result;
