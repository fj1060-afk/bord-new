-- Ends one sign-in session (users end their own; settings managers end anyone's),
-- and restricts function execution. Run once in the Supabase SQL editor.

create function public.end_session(p_session uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  if auth.uid() is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select user_id into v_user from auth.sessions where id = p_session;
  if v_user is null then
    return;
  end if;
  if v_user <> auth.uid() and public.page_level('/admin/settings') < 3 then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from auth.sessions where id = p_session;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_value)
  values (auth.uid(), 'end_session', 'sessions', p_session::text, jsonb_build_object('user_id', v_user));
end;
$$;

-- Tighten function access (flagged by the Supabase security advisor).
revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.end_session(uuid) from public, anon;
revoke execute on function public.list_sessions(uuid) from public, anon;
revoke execute on function public.my_permissions() from public, anon;
revoke execute on function public.page_level(text, uuid) from public, anon;
grant execute on function public.end_session(uuid) to authenticated;
grant execute on function public.list_sessions(uuid) to authenticated;
grant execute on function public.my_permissions() to authenticated;
grant execute on function public.page_level(text, uuid) to authenticated;
