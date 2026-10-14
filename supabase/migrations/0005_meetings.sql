-- Phase 3: meeting preparation. Meetings, invitees and RSVPs, agenda, agenda
-- requests from departments, required documents, uploaded documents (board pack).
-- Organizers = page_level('/meetings') >= 2. Others see only meetings they are
-- invited to, or that their department was asked to contribute to.

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references public.boards (id) on delete restrict,
  committee_id uuid references public.committees (id) on delete restrict,
  number int,
  title text not null,
  meeting_type text not null default 'regular' check (meeting_type in ('regular', 'extraordinary')),
  starts_at timestamptz not null,
  duration_minutes int not null default 120 check (duration_minutes between 15 and 720),
  mode text not null default 'in_person' check (mode in ('in_person', 'virtual', 'hybrid')),
  location text,
  virtual_link text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'cancelled')),
  pack_published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check ((board_id is null) <> (committee_id is null))
);
create index meetings_starts_at_idx on public.meetings (starts_at);

create table public.meeting_invitees (
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete restrict,
  kind text not null default 'member' check (kind in ('member', 'guest')),
  rsvp text not null default 'pending' check (rsvp in ('pending', 'accepted', 'declined', 'tentative')),
  rsvp_note text,
  responded_at timestamptz,
  primary key (meeting_id, person_id)
);

create table public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  position int not null,
  title text not null,
  description text,
  kind text not null default 'discussion' check (kind in ('information', 'discussion', 'decision')),
  duration_minutes int check (duration_minutes between 1 and 480),
  presenter text,
  department_id uuid references public.departments (id) on delete set null,
  created_at timestamptz not null default now()
);
create index agenda_items_meeting_idx on public.agenda_items (meeting_id, position);

create table public.agenda_requests (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete restrict,
  board_id uuid references public.boards (id) on delete cascade,
  committee_id uuid references public.committees (id) on delete cascade,
  title text not null,
  description text,
  kind text not null default 'discussion' check (kind in ('information', 'discussion', 'decision')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  review_note text,
  agenda_item_id uuid references public.agenda_items (id) on delete set null,
  requested_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check ((board_id is null) <> (committee_id is null))
);

create table public.document_requests (
  id uuid primary key default gen_random_uuid(),
  agenda_item_id uuid not null references public.agenda_items (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete restrict,
  title text not null,
  due_date date,
  status text not null default 'requested' check (status in ('requested', 'submitted', 'accepted', 'returned')),
  review_note text,
  created_at timestamptz not null default now()
);

create table public.meeting_documents (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  agenda_item_id uuid references public.agenda_items (id) on delete set null,
  document_request_id uuid references public.document_requests (id) on delete set null,
  title text not null,
  storage_path text not null unique,
  file_name text not null,
  size_bytes bigint,
  mime_type text,
  uploaded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Access helpers

create function public.can_organize_meetings()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.page_level('/meetings') >= 2;
$$;

create function public.is_meeting_invitee(p_meeting uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.meeting_invitees i
    join public.people p on p.id = i.person_id
    where i.meeting_id = p_meeting and p.user_id = auth.uid()
  ) and exists (select 1 from public.meetings m where m.id = p_meeting and m.status <> 'draft');
$$;

create function public.is_department_delegate(p_department uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.department_delegates d
    join public.profiles p on p.id = d.user_id
    where d.department_id = p_department and d.user_id = auth.uid() and p.status = 'active'
  );
$$;

create function public.is_meeting_contributor(p_meeting uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.document_requests r
    join public.agenda_items a on a.id = r.agenda_item_id
    where a.meeting_id = p_meeting and public.is_department_delegate(r.department_id)
  );
$$;

create function public.can_view_meeting(p_meeting uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_organize_meetings() or public.is_meeting_invitee(p_meeting)
      or public.is_meeting_contributor(p_meeting);
$$;

create function public.can_view_document(p_document uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.meeting_documents d
    join public.meetings m on m.id = d.meeting_id
    left join public.document_requests r on r.id = d.document_request_id
    where d.id = p_document and (
      public.can_organize_meetings()
      or d.uploaded_by = auth.uid()
      or (m.pack_published_at is not null and public.is_meeting_invitee(m.id))
      or (r.department_id is not null and public.is_department_delegate(r.department_id))
    )
  );
$$;

-- Bodies a department can address an agenda request to (any signed-in user may list them).
create function public.list_meeting_bodies()
returns table (id uuid, name text, kind text)
language sql stable security definer set search_path = '' as $$
  select b.id, b.name, 'board' from public.boards b where b.status = 'active' and auth.uid() is not null
  union all
  select c.id, c.name, 'committee' from public.committees c where c.status = 'active' and auth.uid() is not null;
$$;

-- An invitee answers for themself.
create function public.respond_rsvp(p_meeting uuid, p_response text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_response not in ('accepted', 'declined', 'tentative') then
    raise exception 'invalid response' using errcode = '22023';
  end if;
  update public.meeting_invitees i
  set rsvp = p_response, rsvp_note = nullif(trim(p_note), ''), responded_at = now()
  from public.people p
  where i.meeting_id = p_meeting and i.person_id = p.id and p.user_id = auth.uid();
  if not found then
    raise exception 'not invited' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers: meeting numbers per body and year; uploads mark a request submitted.

create function public.set_meeting_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select coalesce(max(m.number), 0) + 1 into new.number
  from public.meetings m
  where m.board_id is not distinct from new.board_id
    and m.committee_id is not distinct from new.committee_id
    and extract(year from m.starts_at at time zone 'Asia/Riyadh') = extract(year from new.starts_at at time zone 'Asia/Riyadh');
  return new;
end;
$$;
create trigger meetings_number before insert on public.meetings
  for each row execute function public.set_meeting_number();

create function public.mark_request_submitted()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.document_request_id is not null then
    update public.document_requests set status = 'submitted', review_note = null
    where id = new.document_request_id and status in ('requested', 'returned');
  end if;
  return new;
end;
$$;
create trigger meeting_documents_submit after insert on public.meeting_documents
  for each row execute function public.mark_request_submitted();

-- ---------------------------------------------------------------------------
-- Row-level security

alter table public.meetings enable row level security;
alter table public.meeting_invitees enable row level security;
alter table public.agenda_items enable row level security;
alter table public.agenda_requests enable row level security;
alter table public.document_requests enable row level security;
alter table public.meeting_documents enable row level security;

create policy meetings_read on public.meetings for select to authenticated
  using (public.can_view_meeting(id));
create policy meetings_insert on public.meetings for insert to authenticated
  with check (public.can_organize_meetings());
create policy meetings_update on public.meetings for update to authenticated
  using (public.can_organize_meetings()) with check (public.can_organize_meetings());

create policy invitees_read on public.meeting_invitees for select to authenticated
  using (public.can_view_meeting(meeting_id));
create policy invitees_write on public.meeting_invitees for all to authenticated
  using (public.can_organize_meetings()) with check (public.can_organize_meetings());

create policy agenda_items_read on public.agenda_items for select to authenticated
  using (public.can_view_meeting(meeting_id));
create policy agenda_items_write on public.agenda_items for all to authenticated
  using (public.can_organize_meetings()) with check (public.can_organize_meetings());

create policy agenda_requests_read on public.agenda_requests for select to authenticated
  using (public.can_organize_meetings() or public.is_department_delegate(department_id));
create policy agenda_requests_insert on public.agenda_requests for insert to authenticated
  with check (
    status = 'pending' and agenda_item_id is null
    and (public.can_organize_meetings() or public.is_department_delegate(department_id))
  );
create policy agenda_requests_update on public.agenda_requests for update to authenticated
  using (public.can_organize_meetings()) with check (public.can_organize_meetings());

create policy document_requests_read on public.document_requests for select to authenticated
  using (public.can_organize_meetings() or public.is_department_delegate(department_id));
create policy document_requests_write on public.document_requests for all to authenticated
  using (public.can_organize_meetings()) with check (public.can_organize_meetings());

create policy meeting_documents_read on public.meeting_documents for select to authenticated
  using (public.can_view_document(id));
create policy meeting_documents_insert on public.meeting_documents for insert to authenticated
  with check (
    uploaded_by = auth.uid() and (
      public.can_organize_meetings()
      or exists (
        select 1 from public.document_requests r
        join public.agenda_items a on a.id = r.agenda_item_id
        where r.id = document_request_id and a.meeting_id = meeting_documents.meeting_id
          and public.is_department_delegate(r.department_id)
      )
    )
  );
create policy meeting_documents_update on public.meeting_documents for update to authenticated
  using (public.can_organize_meetings()) with check (public.can_organize_meetings());

-- ---------------------------------------------------------------------------
-- Private storage for meeting files: path "<meeting_id>/<random>-<file name>".

insert into storage.buckets (id, name, public, file_size_limit)
values ('meeting-documents', 'meeting-documents', false, 26214400)
on conflict (id) do nothing;

create function public.can_upload_meeting_file(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_organize_meetings() or public.is_meeting_contributor(
    case when split_part(p_path, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(p_path, '/', 1)::uuid end
  );
$$;

create policy meeting_files_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'meeting-documents' and public.can_upload_meeting_file(name));
create policy meeting_files_read on storage.objects for select to authenticated
  using (
    bucket_id = 'meeting-documents' and exists (
      select 1 from public.meeting_documents d where d.storage_path = name and public.can_view_document(d.id)
    )
  );

-- ---------------------------------------------------------------------------
-- Department reps open the meetings page to send requests and upload documents.

insert into public.role_permissions (role_id, page, level)
select id, '/meetings', 1 from public.roles where key = 'department_rep'
on conflict do nothing;

create trigger meetings_audit after insert or update or delete on public.meetings
  for each row execute function public.audit_row();
create trigger meeting_invitees_audit after insert or update or delete on public.meeting_invitees
  for each row execute function public.audit_row();
create trigger agenda_items_audit after insert or update or delete on public.agenda_items
  for each row execute function public.audit_row();
create trigger agenda_requests_audit after insert or update or delete on public.agenda_requests
  for each row execute function public.audit_row();
create trigger document_requests_audit after insert or update or delete on public.document_requests
  for each row execute function public.audit_row();
create trigger meeting_documents_audit after insert or update or delete on public.meeting_documents
  for each row execute function public.audit_row();
