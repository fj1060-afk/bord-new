-- One-time launch cleanup: removes every test record and every @bord.test account.
-- Run from the Supabase SQL editor ONLY after a real system admin account exists.
-- Uploaded files stay in Storage; empty the buckets from the dashboard if wanted.
do $$
begin
  if not exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id join auth.users u on u.id = ur.user_id
    where r.key = 'system_admin' and u.email not like '%@bord.test'
  ) then
    raise exception 'Create a real system admin first (an account not ending in @bord.test).';
  end if;
end $$;

truncate public.boards, public.people, public.departments, public.contacts, public.correspondence,
  public.library_documents, public.agenda_requests, public.audit_logs cascade;

delete from auth.users where email like '%@bord.test';
