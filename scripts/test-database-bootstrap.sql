-- Local isolated PostgreSQL fixtures only. Never run on a hosted Supabase project.
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon')then create role anon;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated')then create role authenticated;end if;
end$$;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid()to anon,authenticated;
create schema realtime;
create table realtime.messages(extension text);
alter table realtime.messages enable row level security;
create function realtime.topic()returns text language sql stable as $$select current_setting('realtime.topic',true)$$;
create function realtime.send(jsonb,text,text,boolean)returns void language plpgsql as $$begin return;end$$;
grant usage on schema realtime to authenticated;
