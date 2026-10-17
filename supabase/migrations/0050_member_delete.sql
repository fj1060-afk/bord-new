-- While the site holds trial data, the system administrator may delete a board
-- or committee membership outright (ending it keeps the history; deleting
-- removes it). The audit log keeps a record of every deleted row.
create policy board_members_delete_admin on public.board_members for delete to authenticated
  using (public.page_level('/admin/roles') >= 3);
create policy committee_members_delete_admin on public.committee_members for delete to authenticated
  using (public.page_level('/admin/roles') >= 3);
