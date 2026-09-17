create or replace function public.sanitize_promo_code(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(raw, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function public.is_reserved_promo_code(code text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select upper(coalesce(code, '')) in (
    'LOGIN', 'ADMIN', 'RESET', 'CHAMPION', 'INFLUENCER', 'REWARDS',
    'REGISTER', 'APP', 'SALON', 'NEWRECALL', 'SUPPORT', 'TRIAL'
  );
$$;
