create table if not exists public.owner_config_templates (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  source_device_name text,
  settings_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_config_templates_shop_updated_idx
on public.owner_config_templates (shop_id, updated_at desc);

alter table public.owner_config_templates enable row level security;

drop policy if exists "Owners can read own config templates" on public.owner_config_templates;
create policy "Owners can read own config templates"
on public.owner_config_templates for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Owners can create own config templates" on public.owner_config_templates;
create policy "Owners can create own config templates"
on public.owner_config_templates for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Owners can update own config templates" on public.owner_config_templates;
create policy "Owners can update own config templates"
on public.owner_config_templates for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Owners can delete own config templates" on public.owner_config_templates;
create policy "Owners can delete own config templates"
on public.owner_config_templates for delete
to authenticated
using (owner_id = auth.uid());
