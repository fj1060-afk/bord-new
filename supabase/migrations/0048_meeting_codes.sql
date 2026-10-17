-- Meeting numbers as codes such as BD-2026-001: each board and committee has a
-- short Latin code, and the format (separator, digits, year) is a site setting.
-- The code is written once, when the invitation is issued, and never changes
-- after that, even if the meeting date or the settings change later.
alter table public.service_settings
  add column meeting_number_separator text not null default '-' check (meeting_number_separator in ('-', '/', '.', '_')),
  add column meeting_number_digits smallint not null default 3 check (meeting_number_digits between 1 and 5),
  add column meeting_number_with_year boolean not null default true;

alter table public.boards add column code text not null default 'BD' check (code ~ '^[A-Z]{1,6}$');
alter table public.committees add column code text not null default 'CM' check (code ~ '^[A-Z]{1,6}$');
update public.committees set code = case kind
  when 'audit' then 'AC'
  when 'remuneration_nomination' then 'NRC'
  when 'nomination' then 'NC'
  when 'remuneration' then 'RMC'
  when 'executive' then 'EXC'
  when 'risk' then 'RC'
  else 'CM' end
where kind <> 'other';

alter table public.meetings
  add column number_year smallint,
  add column code text;

create or replace function public.set_meeting_number()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  issuing boolean := new.status = 'scheduled' and (tg_op = 'INSERT' or old.status is distinct from 'scheduled');
  s public.service_settings;
  body_code text;
  y smallint;
begin
  if tg_op = 'INSERT' and new.status = 'draft' then
    new.number := null;
    new.number_year := null;
    new.code := null;
  end if;
  if issuing then
    new.invited_at := now();
  end if;
  -- Numbered once, on first issue; fixed afterwards.
  if issuing and new.number is null then
    perform pg_advisory_xact_lock(hashtext(coalesce(new.board_id, new.committee_id)::text));
    y := extract(year from new.starts_at at time zone 'Asia/Riyadh');
    select coalesce(max(m.number), 0) + 1 into new.number
    from public.meetings m
    where m.id <> new.id
      and m.board_id is not distinct from new.board_id
      and m.committee_id is not distinct from new.committee_id
      and m.number_year = y;
    new.number_year := y;
    select * into s from public.service_settings where id;
    if new.board_id is not null then
      select b.code into body_code from public.boards b where b.id = new.board_id;
    else
      select c.code into body_code from public.committees c where c.id = new.committee_id;
    end if;
    new.code := coalesce(body_code, 'MT') || coalesce(s.meeting_number_separator, '-')
      || case when coalesce(s.meeting_number_with_year, true) then y::text || coalesce(s.meeting_number_separator, '-') else '' end
      || lpad(new.number::text, coalesce(s.meeting_number_digits, 3), '0');
  end if;
  return new;
end;
$$;

-- Saves the bodies' codes from the settings page (system administrators only).
create or replace function public.set_body_codes(p_codes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.page_level('/admin/settings') < 3 then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.boards b set code = upper(e.value) from jsonb_each_text(p_codes) e where 'board:' || b.id::text = e.key;
  update public.committees c set code = upper(e.value) from jsonb_each_text(p_codes) e where 'committee:' || c.id::text = e.key;
end;
$$;
