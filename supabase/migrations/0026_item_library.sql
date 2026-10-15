-- The company's own standard agenda items, added to the built-in library
-- that suggests item titles as they are typed.

create table public.agenda_item_library (
  id uuid primary key default gen_random_uuid(),
  title text not null unique check (length(trim(title)) > 0),
  kind text not null default 'decision' check (kind in ('information', 'discussion', 'decision')),
  category text not null default 'بنود الشركة',
  needs text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.agenda_item_library enable row level security;

create policy agenda_item_library_read on public.agenda_item_library for select to authenticated
  using (public.page_level('/meetings') >= 1);
create policy agenda_item_library_insert on public.agenda_item_library for insert to authenticated
  with check (public.can_organize_meetings());
create policy agenda_item_library_update on public.agenda_item_library for update to authenticated
  using (public.can_organize_meetings()) with check (public.can_organize_meetings());
create policy agenda_item_library_delete on public.agenda_item_library for delete to authenticated
  using (public.can_organize_meetings());

create trigger agenda_item_library_audit after insert or update or delete on public.agenda_item_library
  for each row execute function public.audit_row();
