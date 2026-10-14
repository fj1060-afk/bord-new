-- Phase 4: holding the meeting. Attendance, proxies, quorum, live progress, breaks.
-- Only organizers (page_level('/meetings') >= 2) record anything; invitees can read.

alter table public.meetings
  add column live_status text not null default 'not_started'
    check (live_status in ('not_started', 'in_progress', 'paused', 'ended')),
  add column started_at timestamptz,
  add column ended_at timestamptz,
  add column current_item_id uuid references public.agenda_items (id) on delete set null,
  -- Overrides the default quorum (at least half of the members) when the bylaws differ.
  add column quorum_required int check (quorum_required > 0);

alter table public.agenda_items
  add column status text not null default 'pending' check (status in ('pending', 'discussed', 'deferred')),
  add column outcome text,
  add column started_at timestamptz,
  add column ended_at timestamptz;

create table public.meeting_attendance (
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete restrict,
  status text not null check (status in ('present', 'remote', 'absent', 'excused', 'proxy')),
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  primary key (meeting_id, person_id)
);

-- An absent member appoints another member; each holder carries at most one proxy per meeting.
create table public.meeting_proxies (
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  grantor_person_id uuid not null references public.people (id) on delete restrict,
  holder_person_id uuid not null references public.people (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (meeting_id, grantor_person_id),
  unique (meeting_id, holder_person_id),
  check (grantor_person_id <> holder_person_id)
);

create table public.meeting_breaks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index meeting_breaks_one_open on public.meeting_breaks (meeting_id) where ended_at is null;

alter table public.meeting_attendance enable row level security;
alter table public.meeting_proxies enable row level security;
alter table public.meeting_breaks enable row level security;

create policy attendance_read on public.meeting_attendance for select to authenticated
  using (public.can_view_meeting(meeting_id));
create policy attendance_write on public.meeting_attendance for all to authenticated
  using (public.can_organize_meetings()) with check (public.can_organize_meetings());

create policy proxies_read on public.meeting_proxies for select to authenticated
  using (public.can_view_meeting(meeting_id));
create policy proxies_write on public.meeting_proxies for all to authenticated
  using (public.can_organize_meetings()) with check (public.can_organize_meetings());

create policy breaks_read on public.meeting_breaks for select to authenticated
  using (public.can_view_meeting(meeting_id));
create policy breaks_write on public.meeting_breaks for all to authenticated
  using (public.can_organize_meetings()) with check (public.can_organize_meetings());

create trigger meeting_attendance_audit after insert or update or delete on public.meeting_attendance
  for each row execute function public.audit_row();
create trigger meeting_proxies_audit after insert or update or delete on public.meeting_proxies
  for each row execute function public.audit_row();
create trigger meeting_breaks_audit after insert or update or delete on public.meeting_breaks
  for each row execute function public.audit_row();
