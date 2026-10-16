-- Emails the secretary sends from Outlook: who to address them to, and when
-- the pack was emailed to the members.

alter table public.meetings add column pack_emailed_at timestamptz;

-- Email addresses for a meeting's messages (organizers only): invitees (from
-- their person record, else their login), and the people its document
-- requests are addressed to (a user, or a department's delegates).
create function public.meeting_contacts(p_meeting uuid)
returns table (kind text, ref uuid, name text, email text)
language sql stable security definer set search_path = '' as $$
  select 'invitee', i.person_id, pe.full_name, coalesce(nullif(trim(pe.email), ''), pr.email)
  from public.meeting_invitees i
  join public.people pe on pe.id = i.person_id
  left join public.profiles pr on pr.id = pe.user_id
  where i.meeting_id = p_meeting and public.can_organize_meetings()
  union all
  select distinct 'user', pr.id, pr.full_name, pr.email
  from public.document_requests r
  join public.agenda_items a on a.id = r.agenda_item_id
  join public.profiles pr on pr.id = r.assignee_user_id
  where a.meeting_id = p_meeting and public.can_organize_meetings()
  union all
  select distinct 'department', r.department_id, pr.full_name, pr.email
  from public.document_requests r
  join public.agenda_items a on a.id = r.agenda_item_id
  join public.department_delegates dd on dd.department_id = r.department_id
  join public.profiles pr on pr.id = dd.user_id
  where a.meeting_id = p_meeting and public.can_organize_meetings();
$$;

grant execute on function public.meeting_contacts(uuid) to authenticated;
