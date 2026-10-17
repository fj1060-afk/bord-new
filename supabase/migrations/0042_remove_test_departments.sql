-- Run once from the Supabase SQL editor (the MCP times out on deletes):
-- removes the departments the end-to-end tests created, when nothing uses them.
delete from public.departments d
where d.name like 'إدارة اختبار %'
  and not exists (select 1 from public.department_delegates x where x.department_id = d.id)
  and not exists (select 1 from public.agenda_items x where x.department_id = d.id)
  and not exists (select 1 from public.agenda_requests x where x.department_id = d.id)
  and not exists (select 1 from public.document_requests x where x.department_id = d.id)
  and not exists (select 1 from public.resolution_tasks x where x.department_id = d.id);
