alter table public.profiles
  add column if not exists welcome_completed_at timestamptz;
