-- Meeting journey: an agenda item's owner, document requests addressed to a
-- person (not only a department), and justified overrides of soft rules.
alter table public.agenda_items add column owner_user_id uuid references public.profiles (id) on delete set null;
create index agenda_items_owner_idx on public.agenda_items (owner_user_id);

alter table public.document_requests alter column department_id drop not null;
alter table public.document_requests add column assignee_user_id uuid references public.profiles (id) on delete set null;
alter table public.document_requests add constraint document_requests_target check (department_id is not null or assignee_user_id is not null);
create index document_requests_assignee_idx on public.document_requests (assignee_user_id);

-- Whoever must supply a requested document: the department's delegates or the named person.
create function public.can_fulfil_request(p_department uuid, p_assignee uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (p_assignee is not null and p_assignee = auth.uid()) or (p_department is not null and public.is_department_delegate(p_department));
$$;

create or replace function public.is_meeting_contributor(p_meeting uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.document_requests r
    join public.agenda_items a on a.id = r.agenda_item_id
    where a.meeting_id = p_meeting and public.can_fulfil_request(r.department_id, r.assignee_user_id)
  );
$$;

alter policy document_requests_read on public.document_requests
  using (public.can_organize_meetings() or public.can_fulfil_request(department_id, assignee_user_id));

alter policy meeting_documents_insert on public.meeting_documents with check (
  uploaded_by = (select auth.uid()) and (
    public.can_organize_meetings()
    or exists (
      select 1 from public.document_requests r join public.agenda_items a on a.id = r.agenda_item_id
      where r.id = meeting_documents.document_request_id and a.meeting_id = meeting_documents.meeting_id
        and public.can_fulfil_request(r.department_id, r.assignee_user_id))));

-- A soft rule passed with a written reason (e.g. short notice, a waived document).
create table public.meeting_overrides (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  rule text not null,
  reason text not null check (length(trim(reason)) > 0),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (meeting_id, rule)
);
create index meeting_overrides_created_by_idx on public.meeting_overrides (created_by);
alter table public.meeting_overrides enable row level security;
create policy meeting_overrides_read on public.meeting_overrides for select to authenticated using (public.can_view_meeting(meeting_id));
create policy meeting_overrides_write on public.meeting_overrides for insert to authenticated with check (public.can_organize_meetings() and created_by = (select auth.uid()));
create trigger meeting_overrides_audit after insert or update or delete on public.meeting_overrides
  for each row execute function public.audit_row();
