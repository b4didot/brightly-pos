create table if not exists public.device_config_snapshots (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  device_name text not null,
  exported_at timestamptz not null,
  uploaded_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists device_config_snapshots_shop_uploaded_idx
on public.device_config_snapshots (shop_id, uploaded_at desc);

create table if not exists public.device_config_sync_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_device_id uuid references public.devices(id) on delete set null,
  target_device_id uuid not null references public.devices(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'seen', 'accepted', 'applied', 'failed')),
  settings_payload jsonb not null,
  requested_at timestamptz not null default now(),
  seen_at timestamptz,
  accepted_at timestamptz,
  applied_at timestamptz,
  failed_at timestamptz,
  last_error text
);

create index if not exists device_config_sync_requests_target_status_idx
on public.device_config_sync_requests (target_device_id, status, requested_at desc);

alter table public.device_config_snapshots enable row level security;
alter table public.device_config_sync_requests enable row level security;

drop policy if exists "Owners can read own config snapshots" on public.device_config_snapshots;
create policy "Owners can read own config snapshots"
on public.device_config_snapshots for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Owners can read own config sync requests" on public.device_config_sync_requests;
create policy "Owners can read own config sync requests"
on public.device_config_sync_requests for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Owners can create own config sync requests" on public.device_config_sync_requests;
create policy "Owners can create own config sync requests"
on public.device_config_sync_requests for insert
to authenticated
with check (owner_id = auth.uid());
