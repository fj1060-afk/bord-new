-- Run from the SQL editor (the MCP times out on revoke). Email and phone are
-- read only through person_contact(), which applies the hide_contacts switch.
-- A new column on people needs its own "grant select (column)" line here.
revoke select on public.people from authenticated;
grant select (id, full_name, full_name_en, job_title, organization, qualifications, experience, user_id, executive_title, created_at, updated_at)
  on public.people to authenticated;

-- Trigger functions from 0033 need no direct callers.
revoke execute on function public.enforce_remote_meetings(), public.enforce_circular_enabled() from authenticated;
