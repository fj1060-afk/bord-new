-- Agenda item requirements as actions. They are drafted when an item is
-- saved and become document requests only when the secretary sends them for
-- the whole meeting, so editing items does not spam anyone.

create table public.agenda_item_requirements (
  id uuid primary key default gen_random_uuid(),
  agenda_item_id uuid not null references public.agenda_items (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  position int not null default 0,
  kind text not null check (kind in ('doc', 'rec', 'check')),
  label text not null check (length(trim(label)) > 0),
  label_en text,
  source text,
  auto text,
  -- from the standard wording (kept in step with it) or added by hand
  custom boolean not null default false,
  department_id uuid references public.departments (id) on delete set null,
  assignee_user_id uuid references public.profiles (id) on delete set null,
  due_date date,
  -- draft: not sent yet; sent: requested (docs/recs) or active (checks); dismissed: not needed for this item
  status text not null default 'draft' check (status in ('draft', 'sent', 'dismissed')),
  document_request_id uuid references public.document_requests (id) on delete set null,
  checked_by uuid references public.profiles (id) on delete set null,
  checked_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (agenda_item_id, label)
);

create index agenda_item_requirements_meeting_idx on public.agenda_item_requirements (meeting_id);

alter table public.meetings add column requirements_sent_at timestamptz;

alter table public.agenda_item_requirements enable row level security;

create policy agenda_item_requirements_read on public.agenda_item_requirements for select to authenticated
  using (public.can_organize_meetings());
create policy agenda_item_requirements_write on public.agenda_item_requirements for all to authenticated
  using (public.can_organize_meetings()) with check (public.can_organize_meetings());

create trigger agenda_item_requirements_audit after insert or update or delete on public.agenda_item_requirements
  for each row execute function public.audit_row();
