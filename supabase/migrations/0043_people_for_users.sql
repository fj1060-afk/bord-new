-- Every user is also a person, so they appear wherever people are chosen
-- (the board secretary, members, invitees). Existing users are added once;
-- new ones get their person when the account is created.
insert into public.people (full_name, email, phone, user_id)
select pr.full_name, pr.email, pr.phone, pr.id from public.profiles pr
where not exists (select 1 from public.people p where p.user_id = pr.id) and coalesce(pr.full_name, '') <> '';

-- While the site holds trial data, the system administrator may delete a
-- person (deleting a user removes their person when nothing refers to it).
create policy people_delete_admin on public.people for delete to authenticated
  using (public.page_level('/admin/roles') >= 3);
