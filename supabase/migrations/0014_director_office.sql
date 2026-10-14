-- Phase 7: the director's office. Correspondence (incoming mail, outgoing drafts)
-- with follow-up dates, and an address book. Readers need /director-office view;
-- writers need edit.
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization text,
  title text,
  email text,
  phone text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.correspondence (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('incoming', 'outgoing')),
  status text not null,
  subject text not null,
  body text,
  reference text,
  contact_id uuid references public.contacts (id) on delete set null,
  dated_on date,
  due_date date,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (direction = 'incoming' and status in ('new', 'in_progress', 'closed'))
    or (direction = 'outgoing' and status in ('draft', 'sent', 'closed'))
  )
);

create index correspondence_due_idx on public.correspondence (due_date) where status <> 'closed';

create trigger correspondence_touch before update on public.correspondence
  for each row execute function public.touch_updated_at();

alter table public.contacts enable row level security;
alter table public.correspondence enable row level security;

create policy contacts_read on public.contacts for select to authenticated
  using (public.page_level('/director-office') >= 1);
create policy contacts_insert on public.contacts for insert to authenticated
  with check (public.page_level('/director-office') >= 2);
create policy contacts_update on public.contacts for update to authenticated
  using (public.page_level('/director-office') >= 2) with check (public.page_level('/director-office') >= 2);
create policy contacts_delete on public.contacts for delete to authenticated
  using (public.page_level('/director-office') >= 2);

create policy correspondence_read on public.correspondence for select to authenticated
  using (public.page_level('/director-office') >= 1);
create policy correspondence_insert on public.correspondence for insert to authenticated
  with check (public.page_level('/director-office') >= 2);
create policy correspondence_update on public.correspondence for update to authenticated
  using (public.page_level('/director-office') >= 2) with check (public.page_level('/director-office') >= 2);
-- Only unsent drafts can be deleted; everything else is closed instead.
create policy correspondence_delete on public.correspondence for delete to authenticated
  using (public.page_level('/director-office') >= 2 and status = 'draft');

create trigger contacts_audit after insert or update or delete on public.contacts
  for each row execute function public.audit_row();
create trigger correspondence_audit after insert or update or delete on public.correspondence
  for each row execute function public.audit_row();
