# Brightly POS Development

This document is for developers and agents working on the codebase.

## Setup

Install dependencies:

```sh
npm install
```

Run the local dev server:

```sh
npm run dev
```

Build the app:

```sh
npm run build
```

Run lint:

```sh
npm run lint
```

Preview a production build:

```sh
npm run preview
```

## Android Commands

Sync web build into Android:

```sh
npm run android:sync
```

Open Android Studio:

```sh
npm run android:open
```

Build debug APK:

```sh
npm run android:apk
```

Debug APK output:

```txt
android/app/build/outputs/apk/debug/app-debug.apk
```

## Project Structure

```txt
src/
  components/
  constants/
  db/
  pages/
    order/
    settings/
  store/
  types/
  utils/
android/
docs/
```

## Key Files

- `src/App.tsx` - app root wrapper.
- `src/components/AppShell.tsx` - navigation, loading/error state, and active view rendering.
- `src/store/usePosStore.ts` - POS data, cart, checkout, settings, and reports.
- `src/db/database.ts` - Dexie schema, migrations, seeding, reset.
- `src/types/index.ts` - shared domain types.
- `src/utils/download.ts` - web/native download abstraction.

## Development Principles

Keep changes scoped to the feature being worked on.

Prefer existing patterns before adding new abstractions.

Do not rewrite unrelated UI, state, or database logic while fixing a narrow issue.

When persisted types change, update:

- `src/types/index.ts`
- `src/db/database.ts`
- `docs/DATABASE.md`
- Any affected feature docs.

## State Pattern

Use Zustand selectors in components:

```ts
const items = usePosStore((state) => state.items);
const saveItem = usePosStore((state) => state.saveItem);
```

Avoid reading the whole store in components unless there is a specific reason.

After database mutations, prefer reloading the complete snapshot when related state could be affected.

## Database Pattern

Use Dexie for persisted data.

Use Dexie transactions for multi-table writes.

Add a new Dexie version when schema changes.

Backfill old rows in `.upgrade()` when adding required fields.

## Component Pattern

Use function components and hooks.

Keep page-level orchestration in `src/pages`.

Keep reusable shared UI in `src/components`.

Keep page-specific child components inside the page folder, such as:

- `src/pages/order`
- `src/pages/settings`

## Styling Pattern

Use Tailwind classes for most styling.

Use `src/index.css` only for:

- Tailwind import.
- Global resets.
- App-wide keyframes.
- Layout fixes that are difficult to express safely inline.

Maintain touch-friendly controls because the app targets tablet POS workflows.

## Reports And Downloads

Use `downloadFile()` from `src/utils/download.ts` for downloadable files.

This handles both:

- Browser downloads.
- Android native Downloads folder through Capacitor.

## Verification

Before finishing code changes, run the relevant checks.

For general app changes:

```sh
npm run build
npm run lint
```

For Android-specific changes:

```sh
npm run android:sync
npm run android:apk
```

If a check cannot be run, say why in the final response.

## Documentation Maintenance

When code behavior changes, update docs in the same change.

Use this mapping:

- App setup or dependency changes: `README.md`
- Architecture ownership changes: `docs/ARCHITECTURE.md`
- Database schema or persisted data changes: `docs/DATABASE.md`
- User-facing behavior changes: `docs/FEATURES.md`
- Developer workflow or conventions changes: `docs/DEVELOPMENT.md`
- Agent/code rules changes: `docs/RULES.md`
