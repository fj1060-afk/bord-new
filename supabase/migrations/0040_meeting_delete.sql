-- While the site holds trial data, the system administrator (full rights on
-- roles) may delete a meeting outright. Its agenda, invitees, attendance,
-- documents, minutes, resolutions and their tasks go with it (cascade), and
-- the audit log keeps a record of every deleted row.
create policy meetings_delete_admin on public.meetings for delete to authenticated
  using (public.page_level('/admin/roles') >= 3);
