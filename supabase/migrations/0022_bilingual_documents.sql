-- Bilingual printed documents: the company chooses Arabic or Arabic + English,
-- and English counterparts are stored beside the Arabic fields that print.
alter table public.company_profile
  add column name_en text,
  add column document_language text not null default 'ar' check (document_language in ('ar', 'bilingual'));
alter table public.people add column full_name_en text;
alter table public.meetings add column location_en text;
alter table public.agenda_items add column title_en text;
alter table public.minutes add column intro_en text, add column closing_en text;
alter table public.minutes_items add column deliberation_en text;
alter table public.resolutions add column text_en text;
