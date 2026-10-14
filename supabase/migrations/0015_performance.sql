-- Phase 8: performance review (Supabase advisors).
-- 1. Index every foreign key column that has no covering index.
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace and array_length(c.conkey, 1) = 1
      and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1])
  loop
    execute format('create index if not exists %I on %s (%I)', replace(r.tbl::text, 'public.', '') || '_' || r.col || '_idx', r.tbl, r.col);
  end loop;
end $$;

-- 2. Evaluate auth.uid() once per query instead of once per row.
alter policy profiles_read on public.profiles using (id = (select auth.uid()) or public.page_level('/admin/users') >= 1);
alter policy user_roles_read on public.user_roles using (user_id = (select auth.uid()) or public.page_level('/admin/users') >= 1);
alter policy people_read on public.people using (user_id = (select auth.uid()) or public.can_see_people());
alter policy department_delegates_read on public.department_delegates using (user_id = (select auth.uid()) or public.page_level('/admin/departments') >= 1);
alter policy disclosures_read on public.disclosures using (
  public.page_level('/board') >= 2
  or exists (select 1 from public.people p where p.id = disclosures.person_id and p.user_id = (select auth.uid())));
alter policy disclosures_insert on public.disclosures with check (
  status = 'submitted' and reviewed_by is null and (
    public.page_level('/board') >= 2
    or exists (select 1 from public.people p where p.id = disclosures.person_id and p.user_id = (select auth.uid()))));
alter policy meeting_documents_insert on public.meeting_documents with check (
  uploaded_by = (select auth.uid()) and (
    public.can_organize_meetings()
    or exists (
      select 1 from public.document_requests r join public.agenda_items a on a.id = r.agenda_item_id
      where r.id = meeting_documents.document_request_id and a.meeting_id = meeting_documents.meeting_id
        and public.is_department_delegate(r.department_id))));
alter policy resolutions_read_for_tasks on public.resolutions using (
  exists (
    select 1 from public.resolution_tasks t
    where t.resolution_id = resolutions.id and t.status <> 'cancelled'
      and (t.assignee_user_id = (select auth.uid()) or (t.department_id is not null and public.is_department_delegate(t.department_id)))));
alter policy library_insert on public.library_documents with check (public.page_level('/documents') >= 2 and uploaded_by = (select auth.uid()));
