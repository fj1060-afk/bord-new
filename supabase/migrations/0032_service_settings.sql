-- Which outside services may receive the site's text. AI stays off until an
-- administrator turns it on and confirms the provider keeps no data.
create table public.service_settings (
  id boolean primary key default true check (id),
  ai_enabled boolean not null default false,
  ai_no_retention_confirmed boolean not null default false,
  external_translation boolean not null default true,
  external_spelling boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  check (not ai_enabled or ai_no_retention_confirmed)
);

insert into public.service_settings (id) values (true);

create trigger service_settings_touch before update on public.service_settings
  for each row execute function public.touch_updated_at();
create trigger service_settings_audit after insert or update or delete on public.service_settings
  for each row execute function public.audit_row();

alter table public.service_settings enable row level security;
create policy service_settings_read on public.service_settings for select to authenticated using (true);
create policy service_settings_update on public.service_settings for update to authenticated
  using (public.page_level('/admin/settings') >= 3) with check (public.page_level('/admin/settings') >= 3);
