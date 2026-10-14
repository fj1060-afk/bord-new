-- Phase 1: users, roles, page permissions, sessions and audit log.
-- Permission levels per page: 1 = view, 2 = edit, 3 = manage.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  job_title text,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  page text not null,
  level smallint not null check (level between 1 and 3),
  primary key (role_id, page)
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  primary key (user_id, role_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id);

-- ---------------------------------------------------------------------------
-- Permission checks (security definer so policies can call them without recursion)

create function public.page_level(p_page text, p_user uuid default auth.uid())
returns smallint
language sql stable security definer set search_path = ''
as $$
  select coalesce(max(rp.level), 0)::smallint
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  join public.profiles p on p.id = ur.user_id
  where ur.user_id = p_user and rp.page = p_page and p.status = 'active';
$$;

create function public.my_permissions()
returns table (page text, level smallint)
language sql stable security definer set search_path = ''
as $$
  select rp.page, max(rp.level)::smallint
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  join public.profiles p on p.id = ur.user_id
  where ur.user_id = auth.uid() and p.status = 'active'
  group by rp.page;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.page_level('/admin/users') >= 1);
create policy profiles_write on public.profiles for update to authenticated
  using (public.page_level('/admin/users') >= 2)
  with check (public.page_level('/admin/users') >= 2);

create policy roles_read on public.roles for select to authenticated using (true);
create policy roles_write on public.roles for all to authenticated
  using (public.page_level('/admin/roles') >= 3)
  with check (public.page_level('/admin/roles') >= 3);

create policy role_permissions_read on public.role_permissions for select to authenticated
  using (true);
create policy role_permissions_write on public.role_permissions for all to authenticated
  using (public.page_level('/admin/roles') >= 3)
  with check (public.page_level('/admin/roles') >= 3);

create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.page_level('/admin/users') >= 1);
create policy user_roles_write on public.user_roles for all to authenticated
  using (public.page_level('/admin/users') >= 3)
  with check (public.page_level('/admin/users') >= 3);

create policy audit_logs_read on public.audit_logs for select to authenticated
  using (public.page_level('/admin/settings') >= 1);
-- No write policies: rows are written only by the audit trigger below.

-- ---------------------------------------------------------------------------
-- Audit trigger: records who changed what, with values before and after.

create function public.audit_row()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_id text := coalesce(v_new ->> 'id', v_old ->> 'id',
                        coalesce(v_new, v_old) ->> 'user_id', coalesce(v_new, v_old) ->> 'role_id');
begin
  if tg_op = 'UPDATE' and v_old = v_new then
    return new;
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (
    (select id from public.profiles where id = auth.uid()),
    lower(tg_op), tg_table_name, v_id, v_old, v_new
  );
  return coalesce(new, old);
end;
$$;

create trigger profiles_audit after insert or update or delete on public.profiles
  for each row execute function public.audit_row();
create trigger roles_audit after insert or update or delete on public.roles
  for each row execute function public.audit_row();
create trigger role_permissions_audit after insert or update or delete on public.role_permissions
  for each row execute function public.audit_row();
create trigger user_roles_audit after insert or update or delete on public.user_roles
  for each row execute function public.audit_row();

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- New auth users get a profile. The very first user becomes system admin,
-- which bootstraps the platform; everyone after that is added by an admin.

create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  if not exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where r.key = 'system_admin'
  ) then
    insert into public.user_roles (user_id, role_id)
    select new.id, id from public.roles where key = 'system_admin';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Sessions: admins see everyone's sessions; others see their own.
-- Ending a session is in 0002_end_session.sql.

create function public.list_sessions(p_user uuid default null)
returns table (id uuid, user_id uuid, full_name text, created_at timestamptz,
               refreshed_at timestamp, user_agent text, ip text)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.user_id, p.full_name, s.created_at, s.refreshed_at, s.user_agent, host(s.ip)
  from auth.sessions s
  join public.profiles p on p.id = s.user_id
  where auth.uid() is not null
    and (p_user is null or s.user_id = p_user)
    and (s.user_id = auth.uid() or public.page_level('/admin/settings') >= 3)
  order by coalesce(s.refreshed_at, s.created_at) desc;
$$;

-- ---------------------------------------------------------------------------
-- System roles and their default page permissions.

insert into public.roles (key, name, description, is_system) values
  ('system_admin', 'مدير النظام', 'صلاحيات كاملة على كل الصفحات والإدارة', true),
  ('board_secretary', 'أمين المجلس', 'يدير المجلس واللجان والاجتماعات والمحاضر والقرارات', true),
  ('governance_office', 'مكتب الحوكمة', 'يتابع أعمال الحوكمة ويعدّل محتواها', true),
  ('board_member', 'عضو مجلس', 'يطّلع على أعمال المجلس واجتماعاته', true),
  ('committee_member', 'عضو لجنة', 'يطّلع على أعمال لجانه واجتماعاتها', true),
  ('department_rep', 'ممثل إدارة', 'يرفع المستندات المطلوبة ويتابع مهام إدارته', true);

insert into public.role_permissions (role_id, page, level)
select r.id, p.page, p.level
from (values
  ('system_admin', '/', 3), ('system_admin', '/my-tasks', 3), ('system_admin', '/board', 3),
  ('system_admin', '/committees', 3), ('system_admin', '/meetings', 3), ('system_admin', '/minutes', 3),
  ('system_admin', '/resolutions', 3), ('system_admin', '/documents', 3),
  ('system_admin', '/governance-office', 3), ('system_admin', '/director-office', 3),
  ('system_admin', '/admin/users', 3), ('system_admin', '/admin/roles', 3),
  ('system_admin', '/admin/departments', 3), ('system_admin', '/admin/settings', 3),

  ('board_secretary', '/', 1), ('board_secretary', '/my-tasks', 1), ('board_secretary', '/board', 3),
  ('board_secretary', '/committees', 3), ('board_secretary', '/meetings', 3), ('board_secretary', '/minutes', 3),
  ('board_secretary', '/resolutions', 3), ('board_secretary', '/documents', 3),
  ('board_secretary', '/governance-office', 2),

  ('governance_office', '/', 1), ('governance_office', '/my-tasks', 1), ('governance_office', '/board', 2),
  ('governance_office', '/committees', 2), ('governance_office', '/meetings', 2), ('governance_office', '/minutes', 2),
  ('governance_office', '/resolutions', 2), ('governance_office', '/documents', 2),
  ('governance_office', '/governance-office', 3),

  ('board_member', '/', 1), ('board_member', '/my-tasks', 1), ('board_member', '/board', 1),
  ('board_member', '/meetings', 1), ('board_member', '/minutes', 1), ('board_member', '/resolutions', 1),
  ('board_member', '/documents', 1),

  ('committee_member', '/', 1), ('committee_member', '/my-tasks', 1), ('committee_member', '/committees', 1),
  ('committee_member', '/meetings', 1), ('committee_member', '/minutes', 1), ('committee_member', '/resolutions', 1),
  ('committee_member', '/documents', 1),

  ('department_rep', '/', 1), ('department_rep', '/my-tasks', 1), ('department_rep', '/documents', 1)
) as p (role_key, page, level)
join public.roles r on r.key = p.role_key;
