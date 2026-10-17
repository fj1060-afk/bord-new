-- Meetings get their number when the invitation is issued (draft → scheduled),
-- not when the draft is created, so deleted drafts leave no gaps. The number is
-- per body and per year of the meeting date, and stays fixed; a cancelled
-- meeting keeps its number. invited_at records when the invitation was issued
-- (re-issuing after a return to draft updates it).
alter table public.meetings add column invited_at timestamptz;

create or replace function public.set_meeting_number()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  issuing boolean := new.status = 'scheduled' and (tg_op = 'INSERT' or old.status is distinct from 'scheduled');
  moved boolean := tg_op = 'UPDATE' and new.number is not null
    and extract(year from new.starts_at at time zone 'Asia/Riyadh') <> extract(year from old.starts_at at time zone 'Asia/Riyadh');
begin
  if tg_op = 'INSERT' and new.status = 'draft' then
    new.number := null;
  end if;
  if issuing then
    new.invited_at := now();
  end if;
  if (issuing and new.number is null) or moved then
    -- One numbering at a time per body.
    perform pg_advisory_xact_lock(hashtext(coalesce(new.board_id, new.committee_id)::text));
    select coalesce(max(m.number), 0) + 1 into new.number
    from public.meetings m
    where m.id <> new.id
      and m.board_id is not distinct from new.board_id
      and m.committee_id is not distinct from new.committee_id
      and extract(year from m.starts_at at time zone 'Asia/Riyadh') = extract(year from new.starts_at at time zone 'Asia/Riyadh');
  end if;
  return new;
end;
$$;

create trigger meetings_number_update before update of status, starts_at on public.meetings
  for each row execute function public.set_meeting_number();

-- Drafts created before this change lose the number they reserved.
update public.meetings set number = null where status = 'draft';
