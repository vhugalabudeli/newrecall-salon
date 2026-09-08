-- NewRecall salon book: one salon, many staff. Cloud is the source of truth.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.salons (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Your salon',
  billing_email text,
  last_backup_at timestamptz,
  last_restore_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.salon_members (
  salon_id uuid not null references public.salons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (salon_id, user_id)
);

create unique index salon_members_one_salon_per_user
  on public.salon_members (user_id);

create unique index salon_members_one_owner
  on public.salon_members (salon_id)
  where role = 'owner';

alter table public.salon_members
  add constraint salon_members_profile_fk
  foreign key (user_id) references public.profiles (id) on delete cascade;

create or replace function private.user_salon_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select salon_id
  from public.salon_members
  where user_id = (select auth.uid())
$$;

create or replace function private.is_salon_member(p_salon_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.salon_members
    where salon_id = p_salon_id
      and user_id = (select auth.uid())
  )
$$;

create or replace function private.salon_role(p_salon_id uuid)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select role
  from public.salon_members
  where salon_id = p_salon_id
    and user_id = (select auth.uid())
  limit 1
$$;

create table public.salon_invites (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role in ('staff')),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '14 days',
  accepted_at timestamptz
);

create unique index salon_invites_open_email
  on public.salon_invites (lower(email))
  where accepted_at is null;

create table public.service_types (
  id text not null,
  salon_id uuid not null references public.salons (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (salon_id, id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  type_id text not null,
  name text not null,
  lifespan_weeks int not null default 6 check (lifespan_weeks between 2 and 16),
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (salon_id, type_id) references public.service_types (salon_id, id) on delete cascade
);

create index services_salon_type_idx on public.services (salon_id, type_id);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  client_name text not null,
  client_phone text not null default '',
  client_phone_code text not null default '27',
  guest_name text not null default '',
  relationship text not null default 'self',
  service_type text not null default 'hair',
  service text not null default '',
  last_visit_date date not null,
  lifespan_weeks int not null default 6 check (lifespan_weeks between 2 and 16),
  recall_lead text not null default 'on_the_day'
    check (recall_lead in ('on_the_day', 'day_before', 'week_before')),
  booking_status text not null default 'not_yet_booked'
    check (booking_status in ('not_yet_booked', 'acknowledged', 'booked', 'declined')),
  contact_status text not null default 'not_yet_contacted'
    check (contact_status in ('not_yet_contacted', 'contacted_unreachable', 'contacted')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index clients_salon_idx on public.clients (salon_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  text text not null default '',
  related_to text not null default 'general'
    check (related_to in ('booking', 'contact', 'general')),
  status_value text,
  previous_status_value text,
  created_at timestamptz not null default timezone('utc', now()),
  edited_at timestamptz
);

create index notes_client_idx on public.notes (client_id);
create index notes_salon_idx on public.notes (salon_id);

create table public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  salon_id uuid not null references public.salons (id) on delete cascade,
  text text not null,
  at timestamptz not null
);

create index note_versions_note_idx on public.note_versions (note_id, at);

create or replace function public.seed_salon_catalog(p_salon_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  type_row record;
begin
  for type_row in
    select * from (
      values
        ('hair', 'Hair'),
        ('nail', 'Nail'),
        ('waxing', 'Waxing'),
        ('eyelash', 'Eyelash'),
        ('massage', 'Massage'),
        ('tanning', 'Tanning'),
        ('facials', 'Facials')
    ) as t(id, name)
  loop
    insert into public.service_types (id, salon_id, name)
    values (type_row.id, p_salon_id, type_row.name)
    on conflict (salon_id, id) do nothing;
    insert into public.services (salon_id, type_id, name, lifespan_weeks)
    select p_salon_id, type_row.id, 'General', 6
    where not exists (
      select 1 from public.services
      where salon_id = p_salon_id
        and type_id = type_row.id
        and lower(name) = 'general'
    );
  end loop;
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
begin
  display_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), '');
  salon_title := coalesce(nullif(trim(new.raw_user_meta_data ->> 'salon_name'), ''), 'Your salon');

  insert into public.profiles (id, name, email)
  values (new.id, display_name, coalesce(new.email, ''))
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email;

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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.salons enable row level security;
alter table public.salon_members enable row level security;
alter table public.salon_invites enable row level security;
alter table public.service_types enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.notes enable row level security;
alter table public.note_versions enable row level security;

create policy "profiles_select_salon" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or id in (
      select user_id
      from public.salon_members
      where salon_id in (select private.user_salon_ids())
    )
  );

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "salons_member_select" on public.salons
  for select to authenticated
  using (private.is_salon_member(id));

create policy "salons_owner_update" on public.salons
  for update to authenticated
  using (private.salon_role(id) = 'owner')
  with check (private.salon_role(id) = 'owner');

create policy "members_select" on public.salon_members
  for select to authenticated
  using (salon_id in (select private.user_salon_ids()));

create policy "members_owner_delete_staff" on public.salon_members
  for delete to authenticated
  using (
    private.salon_role(salon_id) = 'owner'
    and role = 'staff'
  );

create policy "invites_member_select" on public.salon_invites
  for select to authenticated
  using (private.is_salon_member(salon_id));

create policy "invites_owner_insert" on public.salon_invites
  for insert to authenticated
  with check (private.salon_role(salon_id) = 'owner');

create policy "invites_owner_delete" on public.salon_invites
  for delete to authenticated
  using (private.salon_role(salon_id) = 'owner');

create policy "types_member_all" on public.service_types
  for all to authenticated
  using (private.is_salon_member(salon_id))
  with check (private.is_salon_member(salon_id));

create policy "services_member_all" on public.services
  for all to authenticated
  using (private.is_salon_member(salon_id))
  with check (private.is_salon_member(salon_id));

create policy "clients_member_all" on public.clients
  for all to authenticated
  using (private.is_salon_member(salon_id))
  with check (private.is_salon_member(salon_id));

create policy "notes_member_all" on public.notes
  for all to authenticated
  using (private.is_salon_member(salon_id))
  with check (private.is_salon_member(salon_id));

create policy "note_versions_member_all" on public.note_versions
  for all to authenticated
  using (private.is_salon_member(salon_id))
  with check (private.is_salon_member(salon_id));

alter table public.clients replica identity full;
alter table public.notes replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.clients';
    execute 'alter publication supabase_realtime add table public.notes';
  end if;
exception
  when duplicate_object then null;
end $$;

grant usage on schema private to postgres, service_role, authenticated;
grant execute on function private.user_salon_ids() to authenticated, service_role;
grant execute on function private.is_salon_member(uuid) to authenticated, service_role;
grant execute on function private.salon_role(uuid) to authenticated, service_role;

do $$
begin
  grant execute on function public.handle_new_user() to supabase_auth_admin;
  grant execute on function public.seed_salon_catalog(uuid) to supabase_auth_admin;
exception
  when undefined_object then null;
end $$;

grant execute on function public.handle_new_user() to postgres, service_role;
grant execute on function public.seed_salon_catalog(uuid) to postgres, service_role;

revoke all on function public.seed_salon_catalog(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
