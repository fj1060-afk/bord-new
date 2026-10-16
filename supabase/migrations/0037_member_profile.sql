-- Member registration: private identity details, how the member joined the
-- board, and a structured CV whose companies are matched against agenda items.

-- Private details: not granted to authenticated (see 0034), read through person_private().
alter table public.people
  add column national_id text,
  add column nationality text,
  add column address text;

alter table public.board_members
  add column appointment_basis text not null default 'elected'
    check (appointment_basis in ('elected', 'appointed_vacancy', 'representative')),
  add column appointment_ref text,
  add column represents text;

create table public.person_positions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  organization text not null check (length(trim(organization)) > 1),
  role text not null check (role in ('owner', 'partner', 'chair', 'vice_chair', 'board_member', 'committee_member', 'ceo', 'executive', 'employee', 'advisor', 'other')),
  title text,
  listed boolean not null default false,
  start_year int check (start_year between 1950 and 2100),
  end_year int check (end_year between 1950 and 2100),
  created_at timestamptz not null default now(),
  check (end_year is null or start_year is null or end_year >= start_year)
);
create index person_positions_person_idx on public.person_positions (person_id);

create trigger person_positions_audit after insert or update or delete on public.person_positions
  for each row execute function public.audit_row();

alter table public.person_positions enable row level security;
-- Whoever sees the member, and meeting organizers (the conflict check runs for them), read the CV.
create policy person_positions_read on public.person_positions for select to authenticated using (
  public.can_see_people() or public.can_organize_meetings()
  or exists (select 1 from public.people p where p.id = person_id and p.user_id = (select auth.uid()))
);
-- Member editors keep it, and members keep their own.
create policy person_positions_write on public.person_positions for all to authenticated using (
  public.can_edit_people() or exists (select 1 from public.people p where p.id = person_id and p.user_id = (select auth.uid()))
) with check (
  public.can_edit_people() or exists (select 1 from public.people p where p.id = person_id and p.user_id = (select auth.uid()))
);

-- Identity details: the person and member editors only.
create function public.person_private(p_person uuid)
returns table (national_id text, nationality text, address text)
language sql stable security definer set search_path = '' as $$
  select p.national_id, p.nationality, p.address from public.people p
  where p.id = p_person and (p.user_id = auth.uid() or public.can_edit_people());
$$;
grant execute on function public.person_private(uuid) to authenticated;
