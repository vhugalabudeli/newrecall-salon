alter table public.profiles
  add column if not exists referrer_kind text;

alter table public.profiles
  drop constraint if exists profiles_referrer_kind_check;

alter table public.profiles
  add constraint profiles_referrer_kind_check
  check (referrer_kind is null or referrer_kind in ('influencer', 'champion'));

create table if not exists public.referral_config (
  id smallint primary key default 1 check (id = 1),
  influencer_bounty_cents integer not null default 0 check (influencer_bounty_cents >= 0),
  champion_bounty_cents integer not null default 0 check (champion_bounty_cents >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.referral_config (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  kind text not null check (kind in ('influencer', 'champion')),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  bounty_cents integer check (bounty_cents is null or bounty_cents >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (code),
  unique (owner_user_id)
);

create table if not exists public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  referred_salon_id uuid not null references public.salons (id) on delete cascade,
  promo_code_id uuid not null references public.promo_codes (id) on delete restrict,
  kind text not null check (kind in ('influencer', 'champion')),
  bounty_cents integer not null check (bounty_cents >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (referred_salon_id)
);

create table if not exists public.referral_credits (
  id uuid primary key default gen_random_uuid(),
  redemption_id uuid not null references public.referral_redemptions (id) on delete cascade,
  referred_salon_id uuid not null references public.salons (id) on delete cascade,
  promo_code_id uuid not null references public.promo_codes (id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (redemption_id),
  unique (referred_salon_id)
);

create table if not exists public.referral_payouts (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes (id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  note text not null default '',
  paid_at timestamptz not null default timezone('utc', now())
);

create index if not exists referral_credits_promo_code_id_idx
  on public.referral_credits (promo_code_id);
create index if not exists referral_payouts_promo_code_id_idx
  on public.referral_payouts (promo_code_id);

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

create or replace function public.apply_promo_to_salon(
  p_salon_id uuid,
  p_owner_id uuid,
  p_raw_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned text;
  code_row public.promo_codes%rowtype;
  config_row public.referral_config%rowtype;
  bounty integer;
  redemption_id uuid;
begin
  cleaned := public.sanitize_promo_code(p_raw_code);
  if cleaned = '' or public.is_reserved_promo_code(cleaned) then
    return;
  end if;
  if char_length(cleaned) < 4 or char_length(cleaned) > 12 then
    return;
  end if;

  select * into code_row
  from public.promo_codes
  where code = cleaned
  for update;
  if not found then
    return;
  end if;
  if code_row.owner_user_id = p_owner_id then
    return;
  end if;

  select * into config_row from public.referral_config where id = 1;
  bounty := coalesce(
    code_row.bounty_cents,
    case
      when code_row.kind = 'influencer' then coalesce(config_row.influencer_bounty_cents, 0)
      else coalesce(config_row.champion_bounty_cents, 0)
    end
  );
  if bounty < 0 then
    bounty := 0;
  end if;

  insert into public.referral_redemptions (
    referred_salon_id,
    promo_code_id,
    kind,
    bounty_cents
  )
  values (p_salon_id, code_row.id, code_row.kind, bounty)
  on conflict (referred_salon_id) do nothing
  returning id into redemption_id;
  if redemption_id is null then
    return;
  end if;

  if bounty > 0 then
    insert into public.referral_credits (
      redemption_id,
      referred_salon_id,
      promo_code_id,
      amount_cents
    )
    values (redemption_id, p_salon_id, code_row.id, bounty)
    on conflict (referred_salon_id) do nothing;
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_row public.salon_invites%rowtype;
  new_salon_id uuid;
  display_name text;
  salon_title text;
  referrer_kind text;
begin
  display_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), '');
  salon_title := coalesce(nullif(trim(new.raw_user_meta_data ->> 'salon_name'), ''), 'Your salon');
  referrer_kind := lower(nullif(trim(new.raw_user_meta_data ->> 'referrer_kind'), ''));
  if referrer_kind is distinct from 'influencer' and referrer_kind is distinct from 'champion' then
    referrer_kind := null;
  end if;

  insert into public.profiles (id, name, email, referrer_kind)
  values (new.id, display_name, coalesce(new.email, ''), referrer_kind)
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email,
        referrer_kind = coalesce(public.profiles.referrer_kind, excluded.referrer_kind);

  if referrer_kind is not null then
    return new;
  end if;

  select * into invite_row
  from public.salon_invites
  where lower(email) = lower(new.email)
    and accepted_at is null
    and expires_at > timezone('utc', now())
  order by created_at desc
  limit 1;

  if invite_row.id is not null then
    insert into public.salon_members (salon_id, user_id, role)
    values (invite_row.salon_id, new.id, 'staff')
    on conflict (salon_id, user_id) do nothing;
    update public.salon_invites
    set accepted_at = timezone('utc', now())
    where id = invite_row.id;
    return new;
  end if;

  insert into public.salons (name)
  values (salon_title)
  returning id into new_salon_id;

  insert into public.salon_members (salon_id, user_id, role)
  values (new_salon_id, new.id, 'owner');

  perform public.seed_salon_catalog(new_salon_id);
  perform public.apply_promo_to_salon(
    new_salon_id,
    new.id,
    new.raw_user_meta_data ->> 'promo_code'
  );
  return new;
end;
$$;

create or replace function public.keep_profile_referrer_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.referrer_kind := old.referrer_kind;
  return new;
end;
$$;

drop trigger if exists profiles_keep_referrer_kind on public.profiles;
create trigger profiles_keep_referrer_kind
  before update on public.profiles
  for each row execute function public.keep_profile_referrer_kind();

alter table public.referral_config enable row level security;
alter table public.promo_codes enable row level security;
alter table public.referral_redemptions enable row level security;
alter table public.referral_credits enable row level security;
alter table public.referral_payouts enable row level security;

drop policy if exists "referral_config_select" on public.referral_config;
create policy "referral_config_select" on public.referral_config
  for select to authenticated
  using (true);

drop policy if exists "promo_codes_select_own" on public.promo_codes;
create policy "promo_codes_select_own" on public.promo_codes
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists "referral_redemptions_select_own" on public.referral_redemptions;
create policy "referral_redemptions_select_own" on public.referral_redemptions
  for select to authenticated
  using (
    promo_code_id in (
      select id from public.promo_codes where owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "referral_credits_select_own" on public.referral_credits;
create policy "referral_credits_select_own" on public.referral_credits
  for select to authenticated
  using (
    promo_code_id in (
      select id from public.promo_codes where owner_user_id = (select auth.uid())
    )
  );

drop policy if exists "referral_payouts_select_own" on public.referral_payouts;
create policy "referral_payouts_select_own" on public.referral_payouts
  for select to authenticated
  using (
    promo_code_id in (
      select id from public.promo_codes where owner_user_id = (select auth.uid())
    )
  );

grant select on table public.referral_config to authenticated;
grant select on table public.promo_codes to authenticated;
grant select on table public.referral_redemptions to authenticated;
grant select on table public.referral_credits to authenticated;
grant select on table public.referral_payouts to authenticated;

grant execute on function public.sanitize_promo_code(text) to anon, authenticated, service_role;
grant execute on function public.is_reserved_promo_code(text) to anon, authenticated, service_role;
grant execute on function public.apply_promo_to_salon(uuid, uuid, text) to postgres, service_role;
revoke all on function public.apply_promo_to_salon(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres, service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.keep_profile_referrer_kind() to postgres, service_role;
revoke all on function public.keep_profile_referrer_kind() from public, anon, authenticated;
