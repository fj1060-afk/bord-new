-- A profile's mobile number and name may not repeat another user's (checked
-- when set or changed, so older duplicates are left for the admin to fix).
-- The users page checks the same (more loosely) before creating an account.
create or replace function public.profiles_unique_contact() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.phone is not null and (tg_op = 'INSERT' or new.phone is distinct from old.phone)
     and exists (select 1 from public.profiles p where p.phone = new.phone and p.id <> new.id) then
    raise exception 'رقم الجوال مسجّل لمستخدم آخر.' using errcode = '23505';
  end if;
  if coalesce(trim(new.full_name), '') <> '' and (tg_op = 'INSERT' or new.full_name is distinct from old.full_name)
     and exists (select 1 from public.profiles p where trim(p.full_name) = trim(new.full_name) and p.id <> new.id) then
    raise exception 'يوجد مستخدم بالاسم نفسه.' using errcode = '23505';
  end if;
  return new;
end $$;
create trigger profiles_unique_contact before insert or update of phone, full_name on public.profiles
  for each row execute function public.profiles_unique_contact();
