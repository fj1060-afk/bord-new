-- Phase 5: minutes (versions, signatures), resolutions, follow-up tasks with evidence.

create table public.minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.meetings (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'review', 'approved')),
  intro text,
  closing text,
  version int not null default 0,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.minutes_items (
  minutes_id uuid not null references public.minutes (id) on delete cascade,
  agenda_item_id uuid not null references public.agenda_items (id) on delete cascade,
  deliberation text,
  primary key (minutes_id, agenda_item_id)
);

create table public.minutes_versions (
  id uuid primary key default gen_random_uuid(),
  minutes_id uuid not null references public.minutes (id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (minutes_id, version)
);

create table public.minutes_signatures (
  minutes_id uuid not null references public.minutes (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete restrict,
  version int not null,
  signed_at timestamptz not null default now(),
  primary key (minutes_id, person_id, version)
);

create table public.resolutions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  agenda_item_id uuid references public.agenda_items (id) on delete set null,
  number int,
  text text not null,
  status text not null default 'approved' check (status in ('approved', 'rejected', 'deferred')),
  votes_for int check (votes_for >= 0),
  votes_against int check (votes_against >= 0),
  votes_abstain int check (votes_abstain >= 0),
  created_at timestamptz not null default now()
);

create table public.resolution_tasks (
  id uuid primary key default gen_random_uuid(),
  resolution_id uuid not null references public.resolutions (id) on delete cascade,
  title text not null,
  description text,
  assignee_user_id uuid references public.profiles (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (assignee_user_id is not null or department_id is not null)
);

create table public.task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.resolution_tasks (id) on delete cascade,
  note text,
  status text check (status in ('open', 'in_progress', 'done')),
  evidence_path text unique,
  file_name text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (note is not null or evidence_path is not null)
);

-- ---------------------------------------------------------------------------
-- Access helpers

create function public.can_manage_resolutions()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_organize_meetings() or public.page_level('/resolutions') >= 2;
$$;

-- Members who attended (in person or remotely) sign the minutes.
create function public.minutes_signers(p_minutes uuid)
returns table (person_id uuid, user_id uuid, full_name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.user_id, p.full_name
  from public.minutes mi
  join public.meeting_invitees i on i.meeting_id = mi.meeting_id and i.kind = 'member'
  join public.meeting_attendance a on a.meeting_id = i.meeting_id and a.person_id = i.person_id
  join public.people p on p.id = i.person_id
  where mi.id = p_minutes and a.status in ('present', 'remote')
  order by p.full_name;
$$;

create function public.can_view_minutes(p_minutes uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.minutes m
    where m.id = p_minutes and public.can_view_meeting(m.meeting_id)
      and (m.status <> 'draft' or public.can_organize_meetings())
  );
$$;

create function public.can_work_on_task(p_task uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.resolution_tasks t
    where t.id = p_task and t.status <> 'cancelled' and (
      t.assignee_user_id = auth.uid()
      or (t.department_id is not null and public.is_department_delegate(t.department_id))
    )
  );
$$;

create function public.can_view_task(p_task uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_manage_resolutions() or public.can_work_on_task(p_task) or exists (
    select 1 from public.resolution_tasks t join public.resolutions r on r.id = t.resolution_id
    where t.id = p_task and public.can_view_meeting(r.meeting_id)
  );
$$;

-- A signer signs the version under review; the minutes are approved once everyone has signed.
create function public.sign_minutes(p_minutes uuid)
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

  if not exists (
    select 1 from public.minutes_signers(p_minutes) s
    where not exists (
      select 1 from public.minutes_signatures g
      where g.minutes_id = p_minutes and g.person_id = s.person_id and g.version = v_version
    )
  ) then
    update public.minutes set status = 'approved', approved_at = now() where id = p_minutes;
  end if;
end;
$$;

-- The assignee (or a delegate of the department) reports progress, optionally with evidence.
create function public.report_task_progress(p_task uuid, p_status text, p_note text, p_path text, p_file text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (public.can_work_on_task(p_task) or public.can_manage_resolutions()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_status not in ('open', 'in_progress', 'done') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  if p_path is not null and split_part(p_path, '/', 1) <> p_task::text then
    raise exception 'invalid evidence path' using errcode = '22023';
  end if;
  insert into public.task_updates (task_id, note, status, evidence_path, file_name)
  values (p_task, nullif(trim(p_note), ''), p_status, p_path, p_file);
  update public.resolution_tasks
  set status = p_status, completed_at = case when p_status = 'done' then now() end
  where id = p_task;
end;
$$;

create function public.set_resolution_number()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_board uuid; v_committee uuid; v_year int;
begin
  select board_id, committee_id, extract(year from starts_at at time zone 'Asia/Riyadh')
    into v_board, v_committee, v_year from public.meetings where id = new.meeting_id;
  select coalesce(max(r.number), 0) + 1 into new.number
  from public.resolutions r join public.meetings m on m.id = r.meeting_id
  where m.board_id is not distinct from v_board and m.committee_id is not distinct from v_committee
    and extract(year from m.starts_at at time zone 'Asia/Riyadh') = v_year;
  return new;
end;
$$;
create trigger resolutions_number before insert on public.resolutions
  for each row execute function public.set_resolution_number();

create trigger minutes_touch before update on public.minutes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security

alter table public.minutes enable row level security;
alter table public.minutes_items enable row level security;
alter table public.minutes_versions enable row level security;
alter table public.minutes_signatures enable row level security;
alter table public.resolutions enable row level security;
alter table public.resolution_tasks enable row level security;
alter table public.task_updates enable row level security;

create policy minutes_read on public.minutes for select to authenticated using (public.can_view_minutes(id));
create policy minutes_insert on public.minutes for insert to authenticated with check (public.can_organize_meetings());
-- Approved minutes are final.
create policy minutes_update on public.minutes for update to authenticated
  using (public.can_organize_meetings() and status <> 'approved') with check (public.can_organize_meetings());

create policy minutes_items_read on public.minutes_items for select to authenticated using (public.can_view_minutes(minutes_id));
create policy minutes_items_write on public.minutes_items for all to authenticated
  using (public.can_organize_meetings() and exists (select 1 from public.minutes m where m.id = minutes_id and m.status = 'draft'))
  with check (public.can_organize_meetings() and exists (select 1 from public.minutes m where m.id = minutes_id and m.status = 'draft'));

create policy minutes_versions_read on public.minutes_versions for select to authenticated using (public.can_view_minutes(minutes_id));
create policy minutes_versions_insert on public.minutes_versions for insert to authenticated with check (public.can_organize_meetings());

create policy minutes_signatures_read on public.minutes_signatures for select to authenticated using (public.can_view_minutes(minutes_id));
-- Signatures are written only by sign_minutes().

create policy resolutions_read on public.resolutions for select to authenticated
  using (public.can_manage_resolutions() or public.can_view_meeting(meeting_id));
create policy resolutions_write on public.resolutions for all to authenticated
  using (public.can_manage_resolutions()) with check (public.can_manage_resolutions());

create policy tasks_read on public.resolution_tasks for select to authenticated using (public.can_view_task(id));
create policy tasks_write on public.resolution_tasks for all to authenticated
  using (public.can_manage_resolutions()) with check (public.can_manage_resolutions());

create policy task_updates_read on public.task_updates for select to authenticated using (public.can_view_task(task_id));
-- Updates are written only by report_task_progress().

-- Evidence files: "<task_id>/<random>.<ext>" in a private bucket.
insert into storage.buckets (id, name, public, file_size_limit)
values ('task-evidence', 'task-evidence', false, 26214400)
on conflict (id) do nothing;

create function public.can_upload_task_file(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when split_part(p_path, '/', 1) ~ '^[0-9a-f-]{36}$'
    then public.can_work_on_task(split_part(p_path, '/', 1)::uuid) or public.can_manage_resolutions()
    else false end;
$$;

create policy task_files_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'task-evidence' and public.can_upload_task_file(name));
create policy task_files_read on storage.objects for select to authenticated
  using (
    bucket_id = 'task-evidence' and exists (
      select 1 from public.task_updates u where u.evidence_path = name and public.can_view_task(u.task_id)
    )
  );

create trigger minutes_audit after insert or update or delete on public.minutes
  for each row execute function public.audit_row();
create trigger minutes_signatures_audit after insert or update or delete on public.minutes_signatures
  for each row execute function public.audit_row();
create trigger resolutions_audit after insert or update or delete on public.resolutions
  for each row execute function public.audit_row();
create trigger resolution_tasks_audit after insert or update or delete on public.resolution_tasks
  for each row execute function public.audit_row();
create trigger task_updates_audit after insert or update or delete on public.task_updates
  for each row execute function public.audit_row();
