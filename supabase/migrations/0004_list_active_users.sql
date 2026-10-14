-- Active users for pickers (e.g. department delegates), for people who manage
-- departments but cannot open the Users page.
create function public.list_active_users()
returns table (id uuid, full_name text, email text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name, p.email
  from public.profiles p
  where p.status = 'active'
    and (public.page_level('/admin/departments') >= 2 or public.page_level('/admin/users') >= 1)
  order by p.full_name;
$$;
