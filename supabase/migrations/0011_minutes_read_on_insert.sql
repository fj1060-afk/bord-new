-- can_view_minutes(id) looks the row up again, which fails for a row being inserted
-- (insert ... returning). This policy checks the row's own columns instead.
create policy minutes_read_row on public.minutes for select to authenticated
  using (public.can_view_meeting(meeting_id) and (status <> 'draft' or public.can_organize_meetings()));
