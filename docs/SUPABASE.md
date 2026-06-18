# Brightly POS Supabase Setup

This document describes the production Supabase pieces used by Brightly POS.

## Production Model

Brightly POS remains local-first after device activation. Dexie is still the
source of truth for register use on each device. Supabase owns:

- Owner email/password authentication.
- Owner profiles and shops.
- Single-use device activation tokens.
- Registered devices and device credentials.
- Uploaded sync events for cloud backup, audit, and future reporting.

For the first production release, devices under one shop are independently
local-first. Supabase stores their uploaded events, but does not merge menu,
settings, or order state across devices.

## Database Migration

Apply the migration in:

```txt
supabase/migrations/20260616000100_production_foundation.sql
```

It creates:

- `owner_profiles`
- `shops`
- `device_activation_tokens`, including a hashed token for validation and a
  display token for the owner dashboard
- `devices`
- `sync_events`

It also enables row-level security for owner-readable tables. Edge Functions use
server-side service credentials for privileged token burn, device credential,
and sync ingest operations.

## Edge Functions

Deploy these functions:

```txt
supabase/functions/create-device-token
supabase/functions/activate-device
supabase/functions/sync-device-events
```

`create-device-token` requires a Supabase Auth JWT. `activate-device` and
`sync-device-events` use token/device credential authentication, so their
Supabase JWT verification is disabled in `supabase/config.toml`.

Required function secrets:

```txt
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SITE_URL=https://www.brightlyph.com
DASHBOARD_URL=https://www.brightlyph.com/dashboard
DEVICE_SETUP_URL=https://www.brightlyph.com/device/setup
POS_URL=https://www.brightlyph.com/pos
```

`SUPABASE_SECRET_KEY` can be used instead of `SUPABASE_SERVICE_ROLE_KEY` on
projects using Supabase's newer secret key model.

## Frontend Variables

Set these in Vercel and local `.env.local`:

```txt
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_ORIGIN=https://www.brightlyph.com
VITE_APP_DASHBOARD_PATH=/dashboard
VITE_APP_DEVICE_SETUP_PATH=/device/setup
VITE_APP_POS_PATH=/pos
VITE_SUPABASE_FUNCTIONS_URL=
```

Use either `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Auth URLs

In Supabase Auth settings, allow these redirect/site URLs:

```txt
https://www.brightlyph.com
https://www.brightlyph.com/dashboard
https://www.brightlyph.com/device/setup
http://localhost:5173
http://localhost:5173/dashboard
http://localhost:5173/device/setup
```

Email verification should stay enabled for production owner accounts.

## Local Fallback

If Supabase frontend variables are missing, the app keeps using the existing
local development fallback for owner accounts, activation tokens, and sync
acknowledgement. Production should always configure Supabase variables.
