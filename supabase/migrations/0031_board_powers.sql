-- What decides whether the board can act alone on an item: powers the
-- bylaws restrict, and the General Assembly's current authorizations.

alter table public.company_profile add column bylaws_restrictions text[] not null default '{}';

create table public.ga_authorizations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('interim_dividends', 'related_party', 'buyback')),
  granted_on date not null,
  expires_on date,
  assembly_reference text,
  note text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (expires_on is null or expires_on >= granted_on)
);

alter table public.ga_authorizations enable row level security;

create policy ga_authorizations_read on public.ga_authorizations for select to authenticated using (true);
create policy ga_authorizations_write on public.ga_authorizations for all to authenticated
  using (public.page_level('/admin/company') >= 2) with check (public.page_level('/admin/company') >= 2);

create trigger ga_authorizations_audit after insert or update or delete on public.ga_authorizations
  for each row execute function public.audit_row();
