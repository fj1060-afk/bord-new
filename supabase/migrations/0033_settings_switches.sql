-- Company switches for meetings, decisions and privacy, enforced here so the
-- interface cannot be bypassed.
alter table public.service_settings
  add column circular_enabled boolean not null default true,
  add column remote_meetings boolean not null default true,
  add column pack_requires_disclosure boolean not null default false,
  add column hide_contacts boolean not null default false;

create function public.setting(p_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((to_jsonb(s) ->> p_key)::boolean, false) from public.service_settings s where s.id;
$$;
grant execute on function public.setting(text) to authenticated;

-- Remote attendance: no virtual or hybrid meetings and no remote attendance when off.
create function public.enforce_remote_meetings()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.setting('remote_meetings') then return new; end if;
  if tg_table_name = 'meetings' and new.mode <> 'in_person'
     and (tg_op = 'INSERT' or new.mode is distinct from old.mode) then
    raise exception 'remote meetings are turned off' using errcode = 'P0001';
  end if;
  if tg_table_name = 'meeting_attendance' and new.status = 'remote' then
    raise exception 'remote attendance is turned off' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger meetings_remote_check before insert or update on public.meetings
  for each row execute function public.enforce_remote_meetings();
create trigger attendance_remote_check before insert or update on public.meeting_attendance
  for each row execute function public.enforce_remote_meetings();

-- Circular resolutions: no new ones when off (open ones still close normally).
create function public.enforce_circular_enabled()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not public.setting('circular_enabled') then
    raise exception 'circular resolutions are turned off' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger circular_enabled_check before insert on public.circular_resolutions
  for each row execute function public.enforce_circular_enabled();

-- A member of the meeting's board or committee opens the pack only after
-- filing this year's conflict-of-interest disclosure, when required.
create function public.pack_disclosure_ok(p_meeting uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not public.setting('pack_requires_disclosure')
    or not exists (
      select 1 from public.meetings m
      join public.people p on p.user_id = auth.uid()
      where m.id = p_meeting and (
        exists (select 1 from public.board_members b where b.board_id = m.board_id and b.person_id = p.id and b.status = 'active')
        or exists (select 1 from public.committee_members c where c.committee_id = m.committee_id and c.person_id = p.id and c.status = 'active')
      )
    )
    or exists (
      select 1 from public.disclosures d join public.people p on p.id = d.person_id
      where p.user_id = auth.uid() and d.year = extract(year from now() at time zone 'Asia/Riyadh')::int
    );
$$;
grant execute on function public.pack_disclosure_ok(uuid) to authenticated;

create or replace function public.can_view_document(p_document uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.meeting_documents d
    join public.meetings m on m.id = d.meeting_id
    left join public.document_requests r on r.id = d.document_request_id
    where d.id = p_document and (
      public.can_organize_meetings()
      or d.uploaded_by = auth.uid()
      or (m.pack_published_at is not null and public.is_meeting_invitee(m.id) and public.pack_disclosure_ok(m.id))
      or (r.department_id is not null and public.is_department_delegate(r.department_id))
    )
  );
$$;

-- Contact details: when hidden, only the person, people editors and meeting
-- organizers see a person's email and phone.
create function public.person_contact(p_person uuid)
returns table (email text, phone text)
language sql stable security definer set search_path = '' as $$
  select p.email, p.phone from public.people p
  where p.id = p_person and (
    p.user_id = auth.uid() or public.can_edit_people() or public.can_organize_meetings()
    or (not public.setting('hide_contacts') and public.can_see_people())
  );
$$;
grant execute on function public.person_contact(uuid) to authenticated;
