-- While the site holds trial data, the system administrator (full rights on
-- roles) may delete a department. Delegations go with it; agenda items,
-- tasks and requirements keep their rows with the department cleared, and
-- a department that agenda or document requests still name stays (restrict).
create policy departments_delete_admin on public.departments for delete to authenticated
  using (public.page_level('/admin/roles') >= 3);
