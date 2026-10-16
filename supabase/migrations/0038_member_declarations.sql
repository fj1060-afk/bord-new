-- Declarations beyond the yearly conflict disclosure: competing business
-- (CL 27/2), independence (CGR 19), other board seats (CGR 17/c), and the
-- 5% ownership notice to the Exchange (OSCO 85) kept as filled form data.
create table public.member_declarations (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  kind text not null check (kind in ('competition', 'independence', 'other_boards', 'ownership_notice')),
  year int not null check (year between 2000 and 2100),
  -- competition: engages in a competing business; independence: an issue affecting it exists.
  flagged boolean not null default false,
  details text,
  data jsonb not null default '{}',
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  submitted_by uuid references public.profiles (id) on delete set null default auth.uid(),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id) on delete set null
);
create index member_declarations_person_idx on public.member_declarations (person_id, kind, year);

create trigger member_declarations_audit after insert or update or delete on public.member_declarations
  for each row execute function public.audit_row();

alter table public.member_declarations enable row level security;
-- As the yearly disclosure: the person, and board editors who review them.
create policy member_declarations_read on public.member_declarations for select to authenticated using (
  public.page_level('/board') >= 2
  or exists (select 1 from public.people p where p.id = person_id and p.user_id = (select auth.uid()))
);
create policy member_declarations_insert on public.member_declarations for insert to authenticated with check (
  status = 'submitted' and reviewed_by is null and (
    public.page_level('/board') >= 2
    or exists (select 1 from public.people p where p.id = person_id and p.user_id = (select auth.uid()))
  )
);
create policy member_declarations_update on public.member_declarations for update to authenticated
  using (public.page_level('/board') >= 2) with check (public.page_level('/board') >= 2);
