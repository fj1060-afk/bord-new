-- Phase 11 (continued): executive management for the disclosures register,
-- and members' requests for more information on an agenda item.
alter table public.people add column executive_title text;

create table public.agenda_info_requests (
  id uuid primary key default gen_random_uuid(),
  agenda_item_id uuid not null references public.agenda_items (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  question text not null check (length(trim(question)) > 0),
  requested_by uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  response text,
  responded_by uuid references public.profiles (id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index agenda_info_requests_item_idx on public.agenda_info_requests (agenda_item_id);
create index agenda_info_requests_meeting_idx on public.agenda_info_requests (meeting_id);
create index agenda_info_requests_requested_by_idx on public.agenda_info_requests (requested_by);
create index agenda_info_requests_responded_by_idx on public.agenda_info_requests (responded_by);

alter table public.agenda_info_requests enable row level security;
create policy info_requests_read on public.agenda_info_requests for select to authenticated
  using (requested_by = (select auth.uid()) or public.can_organize_meetings());
-- Invitees ask about items of a meeting they are invited to; the item must belong to that meeting.
create policy info_requests_insert on public.agenda_info_requests for insert to authenticated
  with check (
    requested_by = (select auth.uid()) and response is null
    and public.is_meeting_invitee(meeting_id)
    and exists (select 1 from public.agenda_items a where a.id = agenda_item_id and a.meeting_id = agenda_info_requests.meeting_id));
create policy info_requests_answer on public.agenda_info_requests for update to authenticated
  using (public.can_organize_meetings()) with check (public.can_organize_meetings());
create trigger agenda_info_requests_audit after insert or update or delete on public.agenda_info_requests
  for each row execute function public.audit_row();
