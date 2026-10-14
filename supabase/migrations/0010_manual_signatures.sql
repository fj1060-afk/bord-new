-- Members without an account sign on paper; the secretary records it as a manual signature.
alter table public.minutes_signatures
  add column method text not null default 'electronic' check (method in ('electronic', 'manual')),
  add column recorded_by uuid references public.profiles (id) on delete set null default auth.uid();

create function public.approve_minutes_if_complete(p_minutes uuid, p_version int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.minutes_signers(p_minutes) s
    where not exists (
      select 1 from public.minutes_signatures g
      where g.minutes_id = p_minutes and g.person_id = s.person_id and g.version = p_version
    )
  ) then
    update public.minutes set status = 'approved', approved_at = now() where id = p_minutes and status = 'review';
  end if;
end;
$$;

create or replace function public.sign_minutes(p_minutes uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_version int;
  v_person uuid;
begin
  select version into v_version from public.minutes where id = p_minutes and status = 'review';
  if v_version is null then
    raise exception 'minutes not under review' using errcode = '22023';
  end if;
  select s.person_id into v_person from public.minutes_signers(p_minutes) s where s.user_id = auth.uid();
  if v_person is null then
    raise exception 'not a signer' using errcode = '42501';
  end if;
  insert into public.minutes_signatures (minutes_id, person_id, version)
  values (p_minutes, v_person, v_version) on conflict do nothing;
  perform public.approve_minutes_if_complete(p_minutes, v_version);
end;
$$;

create function public.record_manual_signature(p_minutes uuid, p_person uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_version int;
begin
  if not public.can_organize_meetings() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select version into v_version from public.minutes where id = p_minutes and status = 'review';
  if v_version is null then
    raise exception 'minutes not under review' using errcode = '22023';
  end if;
  if not exists (select 1 from public.minutes_signers(p_minutes) s where s.person_id = p_person) then
    raise exception 'not a signer' using errcode = '22023';
  end if;
  insert into public.minutes_signatures (minutes_id, person_id, version, method)
  values (p_minutes, p_person, v_version, 'manual') on conflict do nothing;
  perform public.approve_minutes_if_complete(p_minutes, v_version);
end;
$$;
