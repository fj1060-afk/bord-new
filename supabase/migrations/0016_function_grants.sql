-- Phase 8: security review. Run from the Supabase SQL editor (the MCP times out on revoke).
-- Nothing in the app calls the API signed out, so the anon role needs no functions.
-- Trigger functions run without EXECUTE, so no one needs to call them directly.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.set_meeting_number(), public.set_resolution_number(), public.mark_request_submitted() from authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
