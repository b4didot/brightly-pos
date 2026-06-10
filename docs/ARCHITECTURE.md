# Brightly POS Architecture

This document describes the current application architecture. Keep it aligned with the code when architecture changes.

## Overview

Brightly POS is a local-first point-of-sale app for small food and beverage shops.

The app runs as:

- A Vite React web app during local development.
- A Capacitor Android app for device packaging.

The app is designed to keep daily POS operations usable even without internet. Core register data is stored locally in IndexedDB through Dexie.

## Current Stack

- React with TypeScript for the UI.
- Vite for development and production builds.
- Tailwind CSS v4 through `@tailwindcss/vite`.
- Zustand for client-side state.
- Dexie for IndexedDB persistence.
- Capacitor for Android packaging.
- XLSX for spreadsheet report exports.
- lucide-react for icons.

## Runtime Flow

The app starts in `src/main.tsx`, renders `App`, then renders `AppShell`.

High-level flow:

1. `AppShell.tsx` loads POS data through `usePosStore.load()`.
2. `AppShell` renders the header navigation.
3. `AppShell` renders the active view.

There is no activation, login, PIN, role, sync, backup, or permission gate in the current app.

## Main Views

`ViewName` is defined in `src/types/index.ts`.

Current views:

- `order` - active ordering and checkout.
- `tickets` - pending, served, and voided orders.
- `settings` - menu, modifier, add-on, discount, payment, and tax settings.
- `report` - transaction reporting and exports.

## State Architecture

The app currently uses one main Zustand store:

- `src/store/usePosStore.ts`

`usePosStore` owns:

- Current active view.
- Loaded database snapshot.
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

The current Dexie schema version is `12`.

`ensureDatabaseSeeded()` is called during store loading to create required default rows and seed starter catalog data when the local database is empty.

## Checkout Architecture

The checkout flow starts in `OrderPage`.

Important behavior:

- Cart lines are in memory only until checkout.
- Transactions and transaction items are persisted only after successful checkout.
- Item names, prices, variants, modifiers, and add-ons are snapshotted into transaction items.
- VAT breakdown is snapshotted into each transaction.
- Discounts and enabled adjustments are computed before transaction persistence.

The app intentionally preserves historical transaction accuracy even if menu items change later.

## Android Architecture

Capacitor config:

- `capacitor.config.ts`

Android project:

- `android/`

Custom Android plugin:

- `android/app/src/main/java/com/brightly/pos/ReportDownloaderPlugin.java`

The custom plugin saves report files into Android Downloads under `Brightly POS`.

Web downloads use browser blob downloads through `src/utils/download.ts`.

## Code Organization

Main source folders:

- `src/components` - shared UI components.
- `src/pages` - top-level app views.
- `src/pages/order` - order flow components.
- `src/pages/settings` - settings sections.
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
- Android packaging behavior.
- Major checkout, reporting, or ticket workflow change.
