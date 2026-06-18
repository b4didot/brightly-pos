create extension if not exists pgcrypto;

create table if not exists public.owner_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  owner_name text not null,
  business_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  shop_code text not null,
  business_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, shop_code)
);

create table if not exists public.device_activation_tokens (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  device_code text not null,
  device_name text not null,
  status text not null default 'active' check (status in ('active', 'used', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_device_id uuid,
  unique (shop_id, device_code)
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_code text not null,
  device_name text not null,
  credential_id uuid not null default gen_random_uuid(),
  credential_secret_hash text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz,
  unique (shop_id, device_code),
  unique (credential_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'device_activation_tokens_used_by_device_id_fkey'
  ) then
    alter table public.device_activation_tokens
      add constraint device_activation_tokens_used_by_device_id_fkey
      foreign key (used_by_device_id) references public.devices(id) on delete set null;
  end if;
end;
$$;

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  local_outbox_id text not null,
  event_type text not null,
  record_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  device_created_at timestamptz,
  unique (device_id, local_outbox_id)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists owner_profiles_touch_updated_at on public.owner_profiles;
create trigger owner_profiles_touch_updated_at
before update on public.owner_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists shops_touch_updated_at on public.shops;
create trigger shops_touch_updated_at
before update on public.shops
for each row execute function public.touch_updated_at();

alter table public.owner_profiles enable row level security;
alter table public.shops enable row level security;
alter table public.device_activation_tokens enable row level security;
alter table public.devices enable row level security;
alter table public.sync_events enable row level security;

drop policy if exists "Owners can read own profile" on public.owner_profiles;
create policy "Owners can read own profile"
on public.owner_profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "Owners can insert own profile" on public.owner_profiles;
create policy "Owners can insert own profile"
on public.owner_profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Owners can update own profile" on public.owner_profiles;
create policy "Owners can update own profile"
on public.owner_profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Owners can read own shops" on public.shops;
create policy "Owners can read own shops"
on public.shops for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Owners can insert own shops" on public.shops;
create policy "Owners can insert own shops"
on public.shops for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Owners can update own shops" on public.shops;
create policy "Owners can update own shops"
on public.shops for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Owners can read own activation tokens" on public.device_activation_tokens;
create policy "Owners can read own activation tokens"
on public.device_activation_tokens for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Owners can read own devices" on public.devices;
create policy "Owners can read own devices"
on public.devices for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Owners can read own sync events" on public.sync_events;
create policy "Owners can read own sync events"
on public.sync_events for select
to authenticated
using (shop_id in (select id from public.shops where owner_id = auth.uid()));
