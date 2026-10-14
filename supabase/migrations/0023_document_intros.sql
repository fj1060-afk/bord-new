-- Editable introductions for the printed agenda and attendance sheet (rich text, sanitised HTML).
alter table public.meetings
  add column agenda_intro text,
  add column agenda_intro_en text,
  add column attendance_intro text,
  add column attendance_intro_en text;
