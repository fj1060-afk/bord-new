-- People assigned a task can read the resolution behind it, without seeing the meeting.
-- The year is stored on the resolution so its reference ("3/2026") needs no meeting lookup.
alter table public.resolutions add column year int;

update public.resolutions r
set year = extract(year from m.starts_at at time zone 'Asia/Riyadh')
from public.meetings m where m.id = r.meeting_id;

create or replace function public.set_resolution_number()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_board uuid; v_committee uuid; v_year int;
begin
  select board_id, committee_id, extract(year from starts_at at time zone 'Asia/Riyadh')
    into v_board, v_committee, v_year from public.meetings where id = new.meeting_id;
  new.year := v_year;
  select coalesce(max(r.number), 0) + 1 into new.number
  from public.resolutions r join public.meetings m on m.id = r.meeting_id
  where m.board_id is not distinct from v_board and m.committee_id is not distinct from v_committee
    and r.year = v_year;
  return new;
end;
$$;

create policy resolutions_read_for_tasks on public.resolutions for select to authenticated
  using (exists (
    select 1 from public.resolution_tasks t
    where t.resolution_id = resolutions.id and t.status <> 'cancelled' and (
      t.assignee_user_id = auth.uid()
      or (t.department_id is not null and public.is_department_delegate(t.department_id))
    )
  ));
