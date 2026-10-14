-- When the last invitation (set-password email) was sent to the user.
alter table public.profiles add column invited_at timestamptz;
