-- Document protection for members: a watermark naming the reader, and
-- view-only opening (PDF shown in the browser, other formats withheld).
alter table public.service_settings
  add column watermark_documents boolean not null default false,
  add column documents_view_only boolean not null default false;

create function public.documents_protected()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.setting('watermark_documents') or public.setting('documents_view_only');
$$;
grant execute on function public.documents_protected() to authenticated;

-- While protection is on, only organizers and the uploader read a meeting
-- file directly; everyone else gets the server's protected copy.
alter policy meeting_files_read on storage.objects using (
  bucket_id = 'meeting-documents' and exists (
    select 1 from public.meeting_documents d
    where d.storage_path = name and public.can_view_document(d.id)
      and (not public.documents_protected() or public.can_organize_meetings() or d.uploaded_by = (select auth.uid()))
  )
);
alter policy library_files_read on storage.objects using (
  bucket_id = 'library' and public.page_level('/documents') >= 1
    and (not public.documents_protected() or public.page_level('/documents') >= 2)
);
