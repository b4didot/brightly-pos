# Brightly POS Environment Variables

Use this document when configuring production, staging, local development, or
Supabase Edge Functions.

## Frontend / Vercel

Set these in Vercel Project Settings > Environment Variables and in local
`.env.local` for development.

```txt
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_ORIGIN=https://www.brightlyph.com
VITE_APP_DASHBOARD_PATH=/dashboard
VITE_APP_DEVICE_SETUP_PATH=/device/setup
VITE_APP_POS_PATH=/pos
VITE_BRIGHTLY_API_URL=
VITE_SUPABASE_FUNCTIONS_URL=
```

Only `VITE_` values are exposed to the browser. Do not put service role,
secret, database, or personal access tokens in Vercel frontend variables.

Use either `VITE_SUPABASE_ANON_KEY` for legacy projects or
`VITE_SUPABASE_PUBLISHABLE_KEY` for projects using Supabase's newer key model.

## Supabase Edge Functions / Backend

Set these as Supabase function secrets or backend environment variables. They
are listed in `supabase.env.example` and can be copied into an ignored
`supabase.env.local` file for local reference.

```txt
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SECRET_KEY=
SITE_URL=https://www.brightlyph.com
DASHBOARD_URL=https://www.brightlyph.com/dashboard
DEVICE_SETUP_URL=https://www.brightlyph.com/device/setup
POS_URL=https://www.brightlyph.com/pos
```

`SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` must stay server-side only.
They are needed for privileged production operations such as atomically burning
device activation tokens, issuing device credentials, and writing trusted sync
records.

Deploy these Supabase Edge Functions with the server-side secrets above:

```txt
create-device-token
activate-device
sync-device-events
```

Supabase Auth should allow these production redirect URLs:

```txt
https://www.brightlyph.com
https://www.brightlyph.com/dashboard
https://www.brightlyph.com/device/setup
```

## Local Admin / Migrations

These are optional and should stay local or in CI secrets:

```txt
SUPABASE_PROJECT_REF=
SUPABASE_ACCESS_TOKEN=
SUPABASE_DB_PASSWORD=
SUPABASE_DB_URL=
```

Use these only for Supabase CLI tasks, database migrations, or admin scripts.
