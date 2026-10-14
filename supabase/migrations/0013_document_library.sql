-- Phase 6: a library of governance documents (policies, charters, reports) beside
-- meeting documents. Readers need /documents view; uploaders need edit.
create table public.library_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'other' check (category in ('policy', 'charter', 'report', 'regulation', 'other')),
  board_id uuid references public.boards (id) on delete set null,
  committee_id uuid references public.committees (id) on delete set null,
  storage_path text not null unique,
  file_name text not null,
  size_bytes bigint,
  mime_type text,
  archived boolean not null default false,
  uploaded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.library_documents enable row level security;

create policy library_read on public.library_documents for select to authenticated
  using (public.page_level('/documents') >= 1);
create policy library_insert on public.library_documents for insert to authenticated
  with check (public.page_level('/documents') >= 2 and uploaded_by = auth.uid());
create policy library_update on public.library_documents for update to authenticated
  using (public.page_level('/documents') >= 2) with check (public.page_level('/documents') >= 2);

insert into storage.buckets (id, name, public, file_size_limit)
values ('library', 'library', false, 26214400)
on conflict (id) do nothing;

create policy library_files_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'library' and public.page_level('/documents') >= 2);
create policy library_files_read on storage.objects for select to authenticated
  using (bucket_id = 'library' and public.page_level('/documents') >= 1);

create trigger library_documents_audit after insert or update or delete on public.library_documents
  for each row execute function public.audit_row();
