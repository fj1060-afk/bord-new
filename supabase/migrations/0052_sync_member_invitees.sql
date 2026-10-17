-- Members join the invitee list of their body's upcoming meetings when they take a seat,
-- and leave it when the seat ends. Invitees used to be copied only when a meeting was
-- created, so a meeting created before its members were seated had nobody to invite.
-- Drafts and upcoming scheduled meetings follow the seats; held ones keep their list.

create function public.sync_member_invitees() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  body_col text := case when tg_table_name = 'board_members' then 'board_id' else 'committee_id' end;
  body_id uuid := case when tg_table_name = 'board_members' then (to_jsonb(new) ->> 'board_id')::uuid else (to_jsonb(new) ->> 'committee_id')::uuid end;
begin
  if new.status = 'active' then
    insert into meeting_invitees (meeting_id, person_id, kind)
    select m.id, new.person_id, 'member'
    from meetings m
    where (m.status = 'draft' or (m.status = 'scheduled' and m.starts_at > now()))
      and (case when body_col = 'board_id' then m.board_id else m.committee_id end) = body_id
    on conflict (meeting_id, person_id) do update set kind = 'member';
  elsif tg_op = 'UPDATE' and old.status = 'active' then
    delete from meeting_invitees i
    using meetings m
    where i.meeting_id = m.id and i.person_id = new.person_id and i.kind = 'member'
      and (m.status = 'draft' or (m.status = 'scheduled' and m.starts_at > now()))
      and (case when body_col = 'board_id' then m.board_id else m.committee_id end) = body_id;
  end if;
  return new;
end;
$$;

create trigger board_members_sync_invitees after insert or update of status on public.board_members
  for each row execute function public.sync_member_invitees();
create trigger committee_members_sync_invitees after insert or update of status on public.committee_members
  for each row execute function public.sync_member_invitees();

-- Upcoming meetings created before their members were seated.
insert into meeting_invitees (meeting_id, person_id, kind)
select m.id, b.person_id, 'member'
from meetings m join board_members b on b.board_id = m.board_id and b.status = 'active'
where (m.status = 'draft' or (m.status = 'scheduled' and m.starts_at > now()))
on conflict (meeting_id, person_id) do nothing;

insert into meeting_invitees (meeting_id, person_id, kind)
select m.id, c.person_id, 'member'
from meetings m join committee_members c on c.committee_id = m.committee_id and c.status = 'active'
where (m.status = 'draft' or (m.status = 'scheduled' and m.starts_at > now()))
on conflict (meeting_id, person_id) do nothing;
