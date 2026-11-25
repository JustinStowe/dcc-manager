begin;
-- A shared organization key needs durable budgets across server processes.
-- Application limits below are conservative safeguards, not Groq tier quotas.
create table public.dcc_ai_generations(
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.dcc_campaigns(id)on delete cascade,
 crawler_id uuid not null references public.dcc_crawlers(id)on delete cascade,
 actor_user_id uuid not null references auth.users(id)on delete cascade,
 purpose text not null check(purpose in('class-suggestions','custom-build')),
 fingerprint text not null check(fingerprint~'^[a-f0-9]{64}$'),
 model text not null check(length(model)between 1 and 120),
 status text not null default 'pending'check(status in('pending','succeeded','failed')),
 response jsonb,
 tokens integer not null default 0 check(tokens between 0 and 100000),
 created_at timestamptz not null default now(),finished_at timestamptz
);
create index dcc_ai_actor_created on public.dcc_ai_generations(actor_user_id,created_at desc);
create index dcc_ai_created on public.dcc_ai_generations(created_at desc);
alter table public.dcc_ai_generations enable row level security;
revoke all on public.dcc_ai_generations from anon,authenticated;
grant select on public.dcc_ai_generations to authenticated;
create policy dcc_ai_read on public.dcc_ai_generations for select to authenticated using(dcc_private.is_member(campaign_id)and(actor_user_id=auth.uid()or dcc_private.is_gm(campaign_id)));
create function public.dcc_ai_reserve(p_crawler_id uuid,p_expected_version uuid,p_purpose text,p_fingerprint text,p_model text)returns jsonb
language plpgsql security definer set search_path=''as $$
declare r public.dcc_crawlers%rowtype;cached public.dcc_ai_generations%rowtype;ident uuid;
begin
 if auth.uid()is null then raise exception 'Sign in first.'using errcode='42501';end if;
 select * into r from public.dcc_crawlers where id=p_crawler_id;
 if not found or not dcc_private.is_member(r.campaign_id)or(r.owner_user_id is distinct from auth.uid()and not dcc_private.is_gm(r.campaign_id))then raise exception 'Crawler access denied.'using errcode='42501';end if;
 if r.version is distinct from p_expected_version then raise exception 'Crawler changed.'using errcode='40001';end if;
 if p_purpose is null or p_purpose not in('class-suggestions','custom-build')or p_fingerprint is null or p_fingerprint!~'^[a-f0-9]{64}$'or p_model is null or length(p_model)not between 1 and 120 or r.dungeon_floor<3 or r.advancement->>'reconciled'<>'true'then raise exception 'Invalid System AI request.'using errcode='22023';end if;
 perform pg_advisory_xact_lock(2039015020);
 select * into cached from public.dcc_ai_generations where actor_user_id=auth.uid()and crawler_id=r.id and fingerprint=p_fingerprint and model=p_model and purpose=p_purpose and status='succeeded'and created_at>now()-interval'10 minutes'order by created_at desc limit 1;
 if found then return jsonb_build_object('id',cached.id,'cached',cached.response);end if;
 if exists(select 1 from public.dcc_ai_generations where actor_user_id=auth.uid()and created_at>now()-interval'15 seconds')
 or(select count(*)from public.dcc_ai_generations where created_at>now()-interval'1 minute')>=8
 or(select count(*)from public.dcc_ai_generations where created_at>now()-interval'1 day')>=200
 or(select coalesce(sum(case when status='pending'then 5000 else tokens end),0)from public.dcc_ai_generations where created_at>now()-interval'1 minute')>=20000
 then raise exception 'System AI request budget busy.'using errcode='P0001';end if;
 insert into public.dcc_ai_generations(campaign_id,crawler_id,actor_user_id,purpose,fingerprint,model)values(r.campaign_id,r.id,auth.uid(),p_purpose,p_fingerprint,p_model)returning id into ident;
 return jsonb_build_object('id',ident,'cached',null);
end $$;
create function public.dcc_ai_finish(p_id uuid,p_status text,p_response jsonb,p_tokens integer)returns void
language plpgsql security definer set search_path=''as $$
begin
 if auth.uid()is null then raise exception 'Sign in first.'using errcode='42501';end if;
 if p_status is null or p_status not in('succeeded','failed')or p_tokens is null or p_tokens not between 0 and 100000 or coalesce(octet_length(p_response::text),0)>30000 then raise exception 'Invalid System AI result.'using errcode='22023';end if;
 update public.dcc_ai_generations set status=p_status,response=case when p_status='succeeded'then p_response else null end,tokens=p_tokens,finished_at=now()
 where id=p_id and actor_user_id=auth.uid()and status='pending'and dcc_private.is_member(campaign_id);
 if not found then raise exception 'System AI request unavailable.'using errcode='42501';end if;
end $$;
revoke all on function public.dcc_ai_reserve(uuid,uuid,text,text,text),public.dcc_ai_finish(uuid,text,jsonb,integer)from public,anon,authenticated;
grant execute on function public.dcc_ai_reserve(uuid,uuid,text,text,text),public.dcc_ai_finish(uuid,text,jsonb,integer)to authenticated;
notify pgrst,'reload schema';
commit;
