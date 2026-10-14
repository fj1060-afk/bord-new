-- Phase 2: people, board, committees, departments, annual disclosures.
-- Access follows page permissions: view (1) reads, edit (2) writes, manage (3) removes.

create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  job_title text,
  organization text,
  qualifications text,
  experience text,
  user_id uuid unique references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  term_start date not null,
  term_end date not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  check (term_end > term_start)
);

create table public.board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete restrict,
  position text not null default 'member' check (position in ('chair', 'vice_chair', 'member')),
  category text not null default 'non_executive' check (category in ('independent', 'non_executive', 'executive')),
  start_date date not null default current_date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create unique index board_members_one_active on public.board_members (board_id, person_id) where status = 'active';
create unique index board_members_one_chair on public.board_members (board_id, position)
  where status = 'active' and position in ('chair', 'vice_chair');

create table public.committees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mandate text,
  board_id uuid references public.boards (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create table public.committee_members (
  id uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete restrict,
  position text not null default 'member' check (position in ('chair', 'member', 'secretary')),
  start_date date not null default current_date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create unique index committee_members_one_active on public.committee_members (committee_id, person_id) where status = 'active';
create unique index committee_members_one_chair on public.committee_members (committee_id, position)
  where status = 'active' and position in ('chair', 'secretary');

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create table public.department_delegates (
  department_id uuid not null references public.departments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (department_id, user_id)
);

create table public.disclosures (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  has_conflict boolean not null default false,
  details text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id) on delete set null,
  unique (person_id, year),
  check (not has_conflict or coalesce(length(trim(details)), 0) > 0)
);

-- ---------------------------------------------------------------------------
-- Row-level security

alter table public.people enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.committees enable row level security;
alter table public.committee_members enable row level security;
alter table public.departments enable row level security;
alter table public.department_delegates enable row level security;
alter table public.disclosures enable row level security;

create function public.can_see_people()
returns boolean language sql stable security definer set search_path = '' as $$
  select greatest(public.page_level('/board'), public.page_level('/committees'),
                  public.page_level('/admin/departments')) >= 1;
$$;

create function public.can_edit_people()
returns boolean language sql stable security definer set search_path = '' as $$
  select greatest(public.page_level('/board'), public.page_level('/committees')) >= 2;
$$;

create policy people_read on public.people for select to authenticated
  using (user_id = auth.uid() or public.can_see_people());
create policy people_insert on public.people for insert to authenticated
  with check (public.can_edit_people());
create policy people_update on public.people for update to authenticated
  using (public.can_edit_people()) with check (public.can_edit_people());

create policy boards_read on public.boards for select to authenticated
  using (public.page_level('/board') >= 1 or public.page_level('/committees') >= 1);
create policy boards_write on public.boards for all to authenticated
  using (public.page_level('/board') >= 3) with check (public.page_level('/board') >= 3);

create policy board_members_read on public.board_members for select to authenticated
  using (public.page_level('/board') >= 1);
create policy board_members_insert on public.board_members for insert to authenticated
  with check (public.page_level('/board') >= 2);
create policy board_members_update on public.board_members for update to authenticated
  using (public.page_level('/board') >= 2) with check (public.page_level('/board') >= 2);

create policy committees_read on public.committees for select to authenticated
  using (public.page_level('/committees') >= 1);
create policy committees_write on public.committees for all to authenticated
  using (public.page_level('/committees') >= 3) with check (public.page_level('/committees') >= 3);

create policy committee_members_read on public.committee_members for select to authenticated
  using (public.page_level('/committees') >= 1);
create policy committee_members_insert on public.committee_members for insert to authenticated
  with check (public.page_level('/committees') >= 2);
create policy committee_members_update on public.committee_members for update to authenticated
  using (public.page_level('/committees') >= 2) with check (public.page_level('/committees') >= 2);

create policy departments_read on public.departments for select to authenticated using (true);
create policy departments_write on public.departments for all to authenticated
  using (public.page_level('/admin/departments') >= 2) with check (public.page_level('/admin/departments') >= 2);

create policy department_delegates_read on public.department_delegates for select to authenticated
  using (user_id = auth.uid() or public.page_level('/admin/departments') >= 1);
create policy department_delegates_write on public.department_delegates for all to authenticated
  using (public.page_level('/admin/departments') >= 2) with check (public.page_level('/admin/departments') >= 2);

-- Disclosures: members file their own; board editors read all and file or review on their behalf.
create policy disclosures_read on public.disclosures for select to authenticated
  using (
    public.page_level('/board') >= 2
    or exists (select 1 from public.people p where p.id = person_id and p.user_id = auth.uid())
  );
create policy disclosures_insert on public.disclosures for insert to authenticated
  with check (
    status = 'submitted' and reviewed_by is null and (
      public.page_level('/board') >= 2
      or exists (select 1 from public.people p where p.id = person_id and p.user_id = auth.uid())
    )
  );
create policy disclosures_update on public.disclosures for update to authenticated
  using (public.page_level('/board') >= 2) with check (public.page_level('/board') >= 2);

-- ---------------------------------------------------------------------------
-- Audit and timestamps

create trigger people_audit after insert or update or delete on public.people
  for each row execute function public.audit_row();
create trigger people_touch before update on public.people
  for each row execute function public.touch_updated_at();
create trigger boards_audit after insert or update or delete on public.boards
  for each row execute function public.audit_row();
create trigger board_members_audit after insert or update or delete on public.board_members
  for each row execute function public.audit_row();
create trigger committees_audit after insert or update or delete on public.committees
  for each row execute function public.audit_row();
create trigger committee_members_audit after insert or update or delete on public.committee_members
  for each row execute function public.audit_row();
create trigger departments_audit after insert or update or delete on public.departments
  for each row execute function public.audit_row();
create trigger department_delegates_audit after insert or update or delete on public.department_delegates
  for each row execute function public.audit_row();
create trigger disclosures_audit after insert or update or delete on public.disclosures
  for each row execute function public.audit_row();
