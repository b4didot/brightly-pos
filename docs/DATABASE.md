# Brightly POS Database

This document describes the local database used by Brightly POS.

## Database Engine

Brightly POS stores local data in IndexedDB through Dexie.

Database file:

- `src/db/database.ts`

Database name:

```txt
brightly-pos-v0
```

Current schema version:

```txt
12
```

## Tables

Current tables:

- `categories`
- `items`
- `adjustments`
- `discountTemplates`
- `settings`
- `transactions`
- `transactionItems`
- `itemVariants`
- `modifiers`
- `itemModifiers`
- `itemAddOns`

## Table Purpose

`categories`

Stores menu categories.

`items`

Stores menu items and add-on items.

`adjustments`

Stores enabled or disabled cart-level additions or deductions, such as service charge.

`discountTemplates`

Stores reusable discount options.

`settings`

Stores register-wide settings. This is a singleton row with id `main`.

`transactions`

Stores completed checkout records.

`transactionItems`

Stores item snapshots for completed transactions.

`itemVariants`

Stores item variant options, such as sizes or alternative prices.

`modifiers`

Stores modifier groups with selectable options.

`itemModifiers`

Links modifiers to items.

`itemAddOns`

Links add-on items to regular menu items.

## Important Singleton Rows

Settings:

```txt
settings.id = "main"
```

## Schema Indexes

Current version 12 indexes:

```ts
categories: "&id, name"
items: "&id, categoryId, name, isOutOfStock, isAddOn"
adjustments: "&id, label, enabled"
discountTemplates: "&id, label"
settings: "&id"
transactions: "&id, transactionNumber, createdAt, paymentMethod"
transactionItems: "&id, transactionId, itemId"
itemVariants: "&id, itemId, sortOrder"
modifiers: "&id, label"
itemModifiers: "&id, itemId, modifierId"
itemAddOns: "&id, itemId, addOnItemId"
```

## Seeding

`ensureDatabaseSeeded()` is responsible for default local data.

It ensures:

- Main settings row exists.
- Seed categories exist if categories are empty.
- Seed items exist if items are empty.
- Seed variants, modifiers, modifier links, and add-on links exist when empty.

Seed catalog data lives in:

- `src/constants/catalog.ts`

## Migration Pattern

Each database schema change must add a new Dexie version block.

Use `.upgrade()` when existing rows need backfilled fields.

Examples already in the app:

- Add `isOutOfStock` to items.
- Add order type to old transactions.
- Add served state to transactions.
- Add variants, modifiers, add-ons, and discount support.
- Add void metadata.

## Snapshot Philosophy

Completed transactions should remain historically accurate.

For that reason, `transactionItems` stores snapshots:

- Item name at checkout.
- Item price at checkout.
- Variant selected at checkout.
- Modifiers selected at checkout.
- Add-ons selected at checkout.
- Quantity and line total.

Do not make reports depend on live item records for historical transaction display.

## Checkout Persistence

Checkout creates:

- One `transactions` row.
- One or more `transactionItems` rows.

These are written in a Dexie transaction.

After checkout, the store reloads the database snapshot and clears the cart.

## Void And Served State

Transactions are not edited for normal order changes after checkout.

Current mutable transaction fields are operational state:

- `isServed`
- `isVoided`
- `voidReason`
- `voidedAt`

Voided transactions are excluded from report totals.

## Reset Behavior

`resetDatabase()` deletes and reopens the local database, then calls `ensureDatabaseSeeded()`.

This is destructive for local data and should only be exposed through clear user intent.

## Database Maintenance

Update this document when:

- A Dexie version is added.
- A table is added, removed, or repurposed.
- A table index changes.
- A field is added to a persisted type.
- Seeding behavior changes.
- Reporting depends on new persisted fields.
