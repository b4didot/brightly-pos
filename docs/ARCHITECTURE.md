# Brightly POS Architecture

This document describes the current application architecture. Keep it aligned with the code when architecture changes.

## Overview

Brightly POS is a local-first point-of-sale app for small food and beverage shops.

The app runs as:

- A Vite React web app during local development.
- An installable PWA in production web builds.

The app requires first-time device registration before the POS shell is available. After registration, daily POS operations remain usable even without internet. Core register data is stored locally in IndexedDB through Dexie.

## Current Stack

- React with TypeScript for the UI.
- Vite for development and production builds.
- vite-plugin-pwa for the production web app manifest and service worker.
- Tailwind CSS v4 through `@tailwindcss/vite`.
- Zustand for client-side state.
- Dexie for IndexedDB persistence.
- Supabase for production owner authentication, shop/device registry, activation tokens, and cloud sync event storage.
- XLSX for spreadsheet report exports.
- lucide-react for icons.

## Runtime Flow

The app starts in `src/main.tsx`, renders `App`, then renders `AppShell`.

High-level flow:

1. `AppShell.tsx` loads POS data through `usePosStore.load()`.
2. `AppShell` renders the header navigation.
3. `AppShell` renders the active view.

`App.tsx` owns a small path-route split, with hash-route aliases retained for older links:

- `/` - public landing page with Get Started.
- `/dashboard` - owner login, registration entry, dashboard, and device token generation.
- `/owner/register` - direct owner registration entry.
- `/owner/login` - direct owner login entry.
- `/device/setup` - PWA device setup, installation guidance, and activation.
- `/pos` - POS device route.

The POS route loads local Dexie state, then blocks on the PWA device setup flow until the local `deviceRegistration` singleton has `registrationStatus = "registered"`. In production, the POS shell also requires installed PWA display mode; normal browser tabs continue showing setup/install guidance even if they share the same origin storage. Local development keeps browser POS access available for testing.

The owner portal uses the service boundaries in `src/services/ownerPortal.ts` and `src/services/ownerDashboard.ts`. When Supabase frontend variables are configured, owner registration, login, token listing, token generation, device registration, dashboard devices, synced transaction reporting, config snapshots, owner config templates, and config sync requests use Supabase Auth, Supabase tables, and Edge Functions. Without Supabase, `VITE_BRIGHTLY_API_URL` can point to a legacy backend API. Without either remote option, browser storage fallback keeps local development flows usable.

## Main Views

`ViewName` is defined in `src/types/index.ts`.

Current views:

- `order` - active ordering and checkout.
- `tickets` - pending, served, and voided orders.
- `settings` - menu, modifier, add-on, adjustment, discount, payment, and tax settings.
- `report` - transaction reporting and exports.

## State Architecture

The app currently uses one main Zustand store:

- `src/store/usePosStore.ts`

`usePosStore` owns:

- Current active view.
- Loaded database snapshot.
- Device registration metadata.
- Sync state and sync outbox rows.
- Cart state.
- Checkout actions.
- Tickets actions.
- Settings mutations.
- Report date range.

Most persisted data is read from Dexie into `usePosStore` with the `loadSnapshot()` pattern.

## Persistence Architecture

Local data is stored in IndexedDB through Dexie.

Database entry point:

- `src/db/database.ts`

The database name is:

```txt
brightly-pos-v0
```

The current Dexie schema version is `16`.

`ensureDatabaseSeeded()` is called during store loading to create required default rows, seed starter catalog data when the local database is empty, and create the unregistered device/sync singleton rows.

## PWA Architecture

Production web builds use `vite-plugin-pwa` to generate the web app manifest and
service worker.

The manifest names the app `Brightly POS`, uses standalone display mode, and
declares install icons from `public/`. It does not force a fixed `start_url`.
When `/device/setup?t=TOKEN` is opened in browser mode, the device setup page
temporarily points the manifest link at a tokenized manifest whose `start_url`
is the current setup URL. This lets first-time installs reopen the tokenized
setup URL inside the installed PWA without saving the token locally. If an
installed PWA is launched at `/` from an older home-screen shortcut, the app
detects standalone display mode and routes into the POS setup/registration gate
instead of the public landing page.

The service worker precaches the built app shell and static assets so the web app
can load offline after a first successful production visit. POS data remains
local in IndexedDB through Dexie.

## Registration Architecture

The real sync device identity is server-issued. The POS does not generate a real `deviceId` locally.

The first-time setup flow is documented in `docs/IMPLEMENTATION_PLAN.md`. The owner portal and the POS device are connected only by a single-use activation token.

Current implementation:

1. Owner opens the landing page at `brightlyph.com` and clicks Get Started.
2. Owner creates a shop and opens the dashboard.
3. Owner uses Add Device to generate a single-use device token that is valid for 30 days.
4. The dashboard shows the token, the PWA setup URL, and a QR code pointing to the same setup URL.
5. The target device opens the PWA setup route, currently `/device/setup`.
6. The PWA setup flow asks for Android Phone or Tablet, or iPhone or iPad, then shows matching home-screen installation steps.
7. Token entry happens inside the PWA setup flow after installation guidance.
8. The setup page submits the token through the registration service boundary.
9. The token is marked used and the POS stores returned owner/shop/device identity plus credential fields.
10. The installed PWA POS shell unlocks and loads normal local register workflows.

The registration token is not stored after successful device registration. The backend path uses `POST /api/devices/register`; the development fallback burns the token in browser storage and rejects expired tokens.

## Sync Architecture

Checkout and ticket state changes write local data first. The same Dexie transaction creates a `syncOutbox` row for upload.

`syncPendingOutbox()` runs after registration, on browser reconnect, and periodically uploads pending rows through `src/services/syncClient.ts`. Checkout, served, and voided transaction writes also request an immediate silent sync after local persistence succeeds, so an online POS continuously pushes transaction events upstream without blocking checkout or ticket actions. A small in-flight guard prevents overlapping upload attempts; if another sync is requested while one is running, one follow-up pass runs afterward. When Supabase is configured, sync sends events to the `sync-device-events` Edge Function using server-issued device credential headers. Without Supabase, `VITE_BRIGHTLY_API_URL` can point to a legacy API. Without either remote option, pending entries are locally acknowledged so the outbox lifecycle remains testable during development.

Settings and menu configuration changes write local data first, stamp the settings singleton with `settingsUpdatedAt` and `settingsChangeOrigin`, then append `settings.snapshot` outbox rows using the same local-first queue. A registered POS device also queues a fresh settings snapshot when the POS shell launches, but launch snapshots do not rewrite the actual settings change metadata. When online, settings changes request an immediate background upload; when offline, the outbox keeps the snapshot until the periodic sync or browser `online` event can upload it. The uploaded snapshot payload uses the internal settings transfer format from `src/services/settingsTransfer.ts`, includes a snapshot `syncOrigin` of `pos` or `push` and the persisted settings change metadata, and is stored in Supabase for owner dashboard visibility.

Owner-requested config sync is pull-based from the POS side. The device's periodic sync response can include pending config requests. The POS shows a persistent banner only when an owner push is pending, and the cashier can only accept it. Accepting a request imports the included settings payload locally, clears any current in-memory order sheet, queues a `push` settings snapshot for dashboard audit visibility, then reports progress to the `device-config-sync` Edge Function. Owners create requests through the `owner-config-sync` Edge Function. The owner dashboard Config Sync page is device-centered: each registered device appears as a card with its latest uploaded config snapshot time and POS/PUSH source, plus a pending pill for requested or seen pushes that have not yet been accepted. The dashboard reads config snapshots from `device_config_snapshots` and can fall back to raw `settings.snapshot` sync events when needed. Owners can click Check on a device to load that device's latest snapshot into a Settings Editor that mirrors the POS settings accordion layout and section order. The editor supports shop, device/source summary, categories, items, modifiers, add-ons, adjustments, discounts, VAT, and payment options, can save the edited configuration as a reusable owner config template, and uses Push to Devices to open a modal for selecting one or more target devices.

## Checkout Architecture

The checkout flow starts in `OrderPage`.

Important behavior:

- Cart lines are in memory only until checkout.
- Transactions and transaction items are persisted only after successful checkout.
- Item names, prices, variants, modifiers, and add-ons are snapshotted into transaction items.
- VAT breakdown is snapshotted into each transaction.
- Discounts and enabled charge adjustments are computed before transaction persistence.
- The mobile cart sheet state is reset to `minimized` after successful checkout.

The app intentionally preserves historical transaction accuracy even if menu items change later.

## Download Architecture

Report exports use browser blob downloads through `src/utils/download.ts`.

## Code Organization

Main source folders:

- `src/components` - shared UI components.
- `src/pages` - top-level app views.
- `src/pages/order` - order flow components.
- `src/pages/settings` - settings sections.
- `src/services` - API client, owner portal/device registration service, sync client, and settings transfer helpers.
- `src/store` - Zustand store.
- `src/db` - Dexie setup and migrations.
- `src/utils` - pure utilities and platform download helper.
- `src/constants` - seed catalog data.
- `src/types` - shared domain types.

## Architecture Maintenance

Update this document when any of these change:

- New view or major workflow change.
- New store or major state ownership change.
- Database version or table change.
- PWA packaging behavior.
- Major checkout, reporting, or ticket workflow change.
