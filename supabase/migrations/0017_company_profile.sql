-- Phase 9: the company profile. One row per installation: company type (which
-- rule pack applies), fiscal year, the articles of association's stricter
-- settings, and the board secretary's appointment.
create table public.company_profile (
  id boolean primary key default true check (id),
  name text not null default '',
  company_type text not null default 'unlisted_jsc'
    check (company_type in ('listed_jsc', 'unlisted_jsc', 'llc', 'nonprofit', 'other')),
  fiscal_year_end_month smallint not null default 12 check (fiscal_year_end_month between 1 and 12),
  min_board_meetings smallint not null default 4 check (min_board_meetings between 1 and 24),
  quorum_percent smallint not null default 50 check (quorum_percent between 50 and 100),
  quorum_min_present smallint not null default 3 check (quorum_min_present between 1 and 20),
  proxy_allowed boolean not null default true,
  max_term_years smallint not null default 4 check (max_term_years between 1 and 4),
  invite_days smallint not null default 5 check (invite_days between 0 and 30),
  secretary_person_id uuid references public.people (id) on delete set null,
  secretary_appointed_on date,
  secretary_resolution text,
  secretary_qualification text,
  updated_at timestamptz not null default now()
);

insert into public.company_profile (id) values (true);

create index company_profile_secretary_idx on public.company_profile (secretary_person_id);
create trigger company_profile_touch before update on public.company_profile
  for each row execute function public.touch_updated_at();
create trigger company_profile_audit after insert or update or delete on public.company_profile
  for each row execute function public.audit_row();

alter table public.company_profile enable row level security;
-- Everyone signed in reads it: quorum and term rules depend on it.
create policy company_profile_read on public.company_profile for select to authenticated using (true);
create policy company_profile_update on public.company_profile for update to authenticated
  using (public.page_level('/admin/company') >= 2) with check (public.page_level('/admin/company') >= 2);

insert into public.role_permissions (role_id, page, level)
select r.id, p.page, p.level
from (values ('system_admin', '/admin/company', 3), ('board_secretary', '/admin/company', 2), ('governance_office', '/admin/company', 1)) as p (role, page, level)
join public.roles r on r.key = p.role
on conflict do nothing;
