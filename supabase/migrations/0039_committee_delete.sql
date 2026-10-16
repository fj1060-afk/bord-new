-- While the site holds trial data, the system administrator (full rights on
-- roles) may delete a committee outright. A committee with meetings stays
-- (meetings restrict the delete), as does one with circular resolutions.
create policy committees_delete_admin on public.committees as restrictive for delete to authenticated
  using (
    public.page_level('/admin/roles') >= 3
    and not exists (select 1 from public.circular_resolutions c where c.committee_id = committees.id)
  );
