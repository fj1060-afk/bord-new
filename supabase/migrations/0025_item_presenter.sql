-- The person presenting an agenda item, picked from registered users, and the
-- users grouped by the department they represent (for organizers' pickers).
alter table public.agenda_items add column presenter_user_id uuid references public.profiles (id) on delete set null;
create index agenda_items_presenter_idx on public.agenda_items (presenter_user_id);

create function public.list_people_by_department()
returns table (user_id uuid, full_name text, department_id uuid, department_name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, d.id, d.name
  from public.profiles p
  left join public.department_delegates dd on dd.user_id = p.id
  left join public.departments d on d.id = dd.department_id and d.status = 'active'
  where p.status = 'active'
    and (public.can_organize_meetings() or public.can_manage_resolutions() or public.page_level('/admin/users') >= 1)
  order by d.name nulls last, p.full_name;
$$;
