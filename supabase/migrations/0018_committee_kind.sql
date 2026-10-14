-- Phase 10: committee kind, so the compliance rules know which committee is the audit committee.
alter table public.committees add column kind text not null default 'other'
  check (kind in ('audit', 'remuneration', 'nomination', 'remuneration_nomination', 'executive', 'risk', 'other'));
