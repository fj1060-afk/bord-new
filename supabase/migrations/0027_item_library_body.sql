-- Library items know which meeting they belong to and carry an English title
-- for bilingual documents.

alter table public.agenda_item_library
  add column body text not null default 'any' check (body in ('board', 'audit', 'nrc', 'risk', 'any')),
  add column title_en text;
