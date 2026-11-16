begin;
-- Private, per-user invalidation only. No crawler fields are broadcast.
create function dcc_private.live_topic_allowed(topic text) returns boolean
language sql stable security invoker set search_path='' as $$ select auth.uid() is not null and topic='dcc:user:'||auth.uid()::text $$;
grant execute on function dcc_private.live_topic_allowed(text) to authenticated;
revoke all on function dcc_private.live_topic_allowed(text) from public,anon;
create policy dcc_private_live_read on realtime.messages for select to authenticated using (extension='broadcast' and dcc_private.live_topic_allowed((select realtime.topic())));
create function dcc_private.live_notify(users uuid[]) returns void
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 for recipient in select distinct u from unnest(users) u where u is not null loop
  if exists(select 1 from auth.users where id=recipient) then
   begin perform realtime.send(jsonb_build_object('revision',gen_random_uuid()),'changed','dcc:user:'||recipient::text,true);
   exception when others then raise warning 'DCC live notification unavailable; automatic resync will recover.';end;
  end if;
 end loop;
end $$;
create function dcc_private.live_crawler_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare old_campaign uuid;new_campaign uuid;recipients uuid[]:=array[]::uuid[];gm uuid;
begin
 if tg_op<>'INSERT' then old_campaign:=old.campaign_id;recipients:=array_append(recipients,old.owner_user_id);end if;
 if tg_op<>'DELETE' then new_campaign:=new.campaign_id;recipients:=array_append(recipients,new.owner_user_id);end if;
 for gm in select gm_user_id from public.dcc_campaigns where id=any(array[old_campaign,new_campaign]) loop recipients:=array_append(recipients,gm);end loop;
 perform dcc_private.live_notify(recipients);return null;
end $$;
create trigger dcc_live_crawler after insert or update or delete on public.dcc_crawlers for each row execute function dcc_private.live_crawler_change();
create function dcc_private.live_member_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare campaign uuid;member uuid;gm uuid;
begin
 if tg_op='DELETE' then campaign:=old.campaign_id;member:=old.user_id;else campaign:=new.campaign_id;member:=new.user_id;end if;
 select gm_user_id into gm from public.dcc_campaigns where id=campaign;
 perform dcc_private.live_notify(array[member,gm]);return null;
end $$;
create trigger dcc_live_member after insert or delete on public.dcc_campaign_members for each row execute function dcc_private.live_member_change();
create function dcc_private.live_campaign_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare campaign uuid;recipients uuid[];owner uuid;
begin
 if tg_op='DELETE' then campaign:=old.id;owner:=old.gm_user_id;else campaign:=new.id;owner:=new.gm_user_id;end if;
 select coalesce(array_agg(user_id),array[]::uuid[]) into recipients from public.dcc_campaign_members where campaign_id=campaign;
 recipients:=array_append(recipients,owner);if tg_op='UPDATE' then recipients:=array_append(recipients,old.gm_user_id);end if;
 perform dcc_private.live_notify(recipients);if tg_op='DELETE' then return old;end if;return new;
end $$;
-- Before delete captures members before cascades remove them.
create trigger dcc_live_campaign before insert or update or delete on public.dcc_campaigns for each row execute function dcc_private.live_campaign_change();
create function dcc_private.live_profile_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin if tg_op='DELETE' then perform dcc_private.live_notify(array[old.owner_user_id]);else perform dcc_private.live_notify(array[new.owner_user_id]);end if;return null;end $$;
create trigger dcc_live_profile after insert or update or delete on public.dcc_crawler_profiles for each row execute function dcc_private.live_profile_change();
revoke all on function dcc_private.live_notify(uuid[]),dcc_private.live_crawler_change(),dcc_private.live_member_change(),dcc_private.live_campaign_change(),dcc_private.live_profile_change() from public,anon,authenticated;
commit;
