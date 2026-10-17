-- Run once from the Supabase SQL editor (the MCP times out on deletes):
-- removes the people the end-to-end tests created, with their seats,
-- invitations, attendance and signatures in trial meetings.
with test as (
  select id from public.people
  where full_name like 'عضو اختبار %' or full_name like '%(اختبار)' or full_name like 'مدير تنفيذي %'
)
, s as (delete from public.minutes_signatures where person_id in (select id from test))
, p as (delete from public.meeting_proxies where grantor_person_id in (select id from test) or holder_person_id in (select id from test))
, a as (delete from public.meeting_attendance where person_id in (select id from test))
, i as (delete from public.meeting_invitees where person_id in (select id from test))
, c as (delete from public.committee_members where person_id in (select id from test))
, b as (delete from public.board_members where person_id in (select id from test))
select 1;
delete from public.people
where full_name like 'عضو اختبار %' or full_name like '%(اختبار)' or full_name like 'مدير تنفيذي %';
