-- The company's bylaws, charters and policies as searchable articles, with
-- their versions. The file itself is a library document.
create table public.governance_texts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('bylaws', 'board_charter', 'committee_charter', 'policy', 'other')),
  title text not null check (length(trim(title)) > 0),
  version text,
  approved_on date,
  approved_by text check (approved_by in ('ga_extraordinary', 'ga_ordinary', 'board', 'committee')),
  library_document_id uuid references public.library_documents (id) on delete set null,
  status text not null default 'current' check (status in ('current', 'superseded')),
  superseded_by uuid references public.governance_texts (id) on delete set null,
  -- The pasted text the articles were split from, kept for editing.
  source_text text not null default '',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.governance_articles (
  id uuid primary key default gen_random_uuid(),
  text_id uuid not null references public.governance_texts (id) on delete cascade,
  position int not null,
  number text not null,
  heading text,
  chapter text,
  body text not null default '',
  unique (text_id, position)
);

create index governance_texts_library_idx on public.governance_texts (library_document_id);
create index governance_texts_superseded_idx on public.governance_texts (superseded_by);

create trigger governance_texts_touch before update on public.governance_texts
  for each row execute function public.touch_updated_at();
create trigger governance_texts_audit after insert or update or delete on public.governance_texts
  for each row execute function public.audit_row();

alter table public.governance_texts enable row level security;
alter table public.governance_articles enable row level security;

-- Everyone signed in reads them: members work under these rules.
create policy governance_texts_read on public.governance_texts for select to authenticated using (true);
create policy governance_texts_write on public.governance_texts for all to authenticated
  using (public.page_level('/admin/company') >= 2) with check (public.page_level('/admin/company') >= 2);
create policy governance_articles_read on public.governance_articles for select to authenticated using (true);
create policy governance_articles_write on public.governance_articles for all to authenticated
  using (public.page_level('/admin/company') >= 2) with check (public.page_level('/admin/company') >= 2);
