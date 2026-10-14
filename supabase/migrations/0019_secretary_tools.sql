-- Phase 11: board secretary tools.
-- Remarks on minutes: members' comments on the draft, and the secretary's
-- record of reservations, dissent (Companies Law art. 79/4) and recusals for
-- a conflict of interest (art. 71).
create table public.minutes_remarks (
  id uuid primary key default gen_random_uuid(),
  minutes_id uuid not null references public.minutes (id) on delete cascade,
  resolution_id uuid references public.resolutions (id) on delete cascade,
  person_id uuid references public.people (id) on delete set null,
  kind text not null check (kind in ('comment', 'reservation', 'dissent', 'recusal')),
  note text not null check (length(trim(note)) > 0),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index minutes_remarks_minutes_idx on public.minutes_remarks (minutes_id);
create index minutes_remarks_resolution_idx on public.minutes_remarks (resolution_id);
create index minutes_remarks_person_idx on public.minutes_remarks (person_id);
create index minutes_remarks_created_by_idx on public.minutes_remarks (created_by);

alter table public.minutes_remarks enable row level security;
create policy minutes_remarks_read on public.minutes_remarks for select to authenticated
  using (public.can_view_minutes(minutes_id));
-- Organizers record any kind; anyone who can read the minutes under review may comment.
create policy minutes_remarks_insert on public.minutes_remarks for insert to authenticated
  with check (
    created_by = (select auth.uid()) and (
      public.can_organize_meetings()
      or (kind = 'comment' and public.can_view_minutes(minutes_id)
          and exists (select 1 from public.minutes m where m.id = minutes_id and m.status = 'review'))));
create policy minutes_remarks_delete on public.minutes_remarks for delete to authenticated
  using (public.can_organize_meetings() or created_by = (select auth.uid()));
create trigger minutes_remarks_audit after insert or update or delete on public.minutes_remarks
  for each row execute function public.audit_row();

-- Resolutions by circulation for urgent matters (art. 82): members vote in
-- writing, a majority passes it, and it is recorded at the next meeting.
create table public.circular_resolutions (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references public.boards (id) on delete cascade,
  committee_id uuid references public.committees (id) on delete cascade,
  title text not null,
  text text not null,
  deadline date,
  status text not null default 'open' check (status in ('open', 'passed', 'rejected', 'withdrawn')),
  ratified_meeting_id uuid references public.meetings (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check ((board_id is null) <> (committee_id is null))
);
create index circular_resolutions_board_idx on public.circular_resolutions (board_id);
create index circular_resolutions_committee_idx on public.circular_resolutions (committee_id);
create index circular_resolutions_meeting_idx on public.circular_resolutions (ratified_meeting_id);
create index circular_resolutions_created_by_idx on public.circular_resolutions (created_by);

create table public.circular_votes (
  circular_id uuid not null references public.circular_resolutions (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  vote text not null check (vote in ('approve', 'reject', 'abstain')),
  note text,
  voted_at timestamptz not null default now(),
  primary key (circular_id, person_id)
);
create index circular_votes_person_idx on public.circular_votes (person_id);

-- Active voting members of the body behind a circular resolution.
create function public.circular_voters(p_circular uuid)
returns table (person_id uuid, user_id uuid, full_name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.user_id, p.full_name
  from public.circular_resolutions c
  join public.board_members bm on bm.board_id = c.board_id and bm.status = 'active'
  join public.people p on p.id = bm.person_id
  where c.id = p_circular
  union
  select p.id, p.user_id, p.full_name
  from public.circular_resolutions c
  join public.committee_members cm on cm.committee_id = c.committee_id and cm.status = 'active' and cm.position <> 'secretary'
  join public.people p on p.id = cm.person_id
  where c.id = p_circular;
$$;

alter table public.circular_resolutions enable row level security;
alter table public.circular_votes enable row level security;
create policy circular_read on public.circular_resolutions for select to authenticated
  using (
    public.page_level('/resolutions') >= 1
    or exists (
      select 1 from public.people p
      left join public.board_members bm on bm.person_id = p.id and bm.status = 'active' and bm.board_id = circular_resolutions.board_id
      left join public.committee_members cm on cm.person_id = p.id and cm.status = 'active' and cm.committee_id = circular_resolutions.committee_id
      where p.user_id = (select auth.uid()) and (bm.id is not null or cm.id is not null)));
create policy circular_write on public.circular_resolutions for all to authenticated
  using (public.can_manage_resolutions()) with check (public.can_manage_resolutions());
create policy circular_votes_read on public.circular_votes for select to authenticated
  using (exists (select 1 from public.circular_resolutions c where c.id = circular_id));

-- Members vote through this function only: it checks membership and that voting is open.
create function public.cast_circular_vote(p_circular uuid, p_vote text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_person uuid;
begin
  if p_vote not in ('approve', 'reject', 'abstain') then raise exception 'invalid vote'; end if;
  select v.person_id into v_person from public.circular_voters(p_circular) v where v.user_id = auth.uid();
  if v_person is null then raise exception 'not a voting member'; end if;
  if not exists (select 1 from public.circular_resolutions where id = p_circular and status = 'open') then
    raise exception 'voting is closed';
  end if;
  insert into public.circular_votes (circular_id, person_id, vote, note)
  values (p_circular, v_person, p_vote, nullif(trim(p_note), ''))
  on conflict (circular_id, person_id) do update set vote = excluded.vote, note = excluded.note, voted_at = now();
end;
$$;

create trigger circular_resolutions_audit after insert or update or delete on public.circular_resolutions
  for each row execute function public.audit_row();
create trigger circular_votes_audit after insert or update or delete on public.circular_votes
  for each row execute function public.audit_row();
