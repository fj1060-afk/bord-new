-- The requesting member, so organizers see a name (profiles are private to admins).
alter table public.agenda_info_requests add column person_id uuid references public.people (id) on delete set null;
create index agenda_info_requests_person_idx on public.agenda_info_requests (person_id);
