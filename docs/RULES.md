# Brightly POS Rules

This file contains rules for agents and developers working on Brightly POS.

Use this file as an active maintenance document. If a change makes any rule inaccurate, update this file in the same work.

## Required Documentation Check

Before finishing a change, check whether documentation needs updates.

Update docs when:

- A dependency, install command, or run command changes.
- A route, view, or workflow changes.
- A database table, index, migration, or persisted type changes.
- A store gains or loses ownership of important state.
- PWA packaging or install behavior changes.
- A coding convention changes.

Use this mapping:

- Root `README.md` for setup, dependencies, and run/build instructions.
- `docs/ARCHITECTURE.md` for architecture and ownership.
- `docs/DATABASE.md` for Dexie schema, migrations, tables, and persisted data.
- `docs/ENVIRONMENT.md` for production, Vercel, Supabase, and secret configuration.
- `docs/SUPABASE.md` for Supabase schema, Edge Functions, and cloud sync setup.
- `docs/FEATURES.md` for user-facing behavior.
- `docs/DEVELOPMENT.md` for workflow and implementation conventions.
- `docs/RULES.md` for these rules.

## Architecture Rules

The app is local-first after device registration. First-time device registration requires server validation, but completed registration must allow core POS operation without internet.

Checkout must remain local and reliable.

Do not introduce a backend dependency into order entry, checkout, tickets, settings, or reports after registration without updating architecture docs and explaining the tradeoff.

The current app has mandatory device registration, owner portal mock login/register pages, local settings import/export, and sync outbox scaffolding. It has no cashier login, PIN, role, or permission gate.

## State Rules

Use `usePosStore` for:

- Active view.
- Loaded POS data.
- Cart.
- Checkout.
- Tickets.
- Settings mutations.
- Reports.

Use specific Zustand selectors in React components.

Do not use `usePosStore()` to pull the whole store unless there is a specific performance-safe reason.

## Database Rules

All persisted app data must go through Dexie.

Database schema lives in `src/db/database.ts`.

Shared persisted types live in `src/types/index.ts`.

When adding or changing persisted fields:

- Update TypeScript types.
- Add a Dexie migration if existing local data needs the field.
- Update seed/default behavior if needed.
- Update `docs/DATABASE.md`.

Use Dexie transactions for multi-table writes.

Do not make historical reports depend on live item/category records. Use transaction snapshots.

## Checkout Rules

Cart state is in memory until checkout.

Checkout persists:

- One transaction.
- One or more transaction item snapshots.

Transaction item snapshots must preserve:

- Item name.
- Item price.
- Variant selection.
- Modifier selection.
- Add-on selection.
- Quantity.
- Line total.

Do not remove snapshot fields just because equivalent live item data exists.

## Tickets And Reports Rules

Voided transactions remain stored.

Voided transactions should be visible in tickets.

Voided transactions should not be counted in report totals.

Changing void, served, or reporting behavior requires updates to:

- `docs/FEATURES.md`
- `docs/DATABASE.md` if persisted fields change.

## Component Rules

Use function components with hooks.

Use TypeScript for all React components.

Keep reusable UI in `src/components`.

Keep page-specific components inside their page folder.

Examples:

- Order-only components go in `src/pages/order`.
- Settings-only components go in `src/pages/settings`.

Prefer named handler functions when logic is non-trivial.

## Styling Rules

Use Tailwind utility classes as the default styling method.

Keep `src/index.css` limited to:

- Tailwind import.
- Global resets.
- Keyframes.
- Layout rules that are impractical or unsafe inline.

The UI is tablet-first and touch-first.

Controls must remain large enough for fast cashier use.

Avoid dense desktop-dashboard patterns for primary POS workflows.

## Utility Rules

Utility functions should be typed and focused.

Keep pure calculation logic in `src/utils` when possible.

Examples:

- Money formatting in `money.ts`.
- Cart calculations in `cart.ts`.
- VAT calculations in `vat.ts`.
- Date helpers in `dates.ts`.

Platform-aware file downloads should go through `src/utils/download.ts`.

## PWA Rules

Production web builds use `vite-plugin-pwa` for installable app behavior.

Report exports use browser file downloads through `src/utils/download.ts`.

If PWA packaging or download behavior changes, update:

- `src/utils/download.ts` if file download behavior changes.
- `docs/ARCHITECTURE.md`
- `docs/FEATURES.md`
- `docs/DEVELOPMENT.md`

## Agent Maintenance Rule

When an agent changes code, it must ask:

1. Did this change alter setup, architecture, database, features, development workflow, or rules?
2. If yes, which doc owns that information?
3. Has that doc been updated in this same change?

If the answer to step 3 is no, update the relevant document before finishing.

Do not leave docs knowingly stale.
