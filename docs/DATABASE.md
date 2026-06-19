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
15
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
- `deviceRegistration`
- `syncOutbox`
- `syncState`

## Table Purpose

`categories`

Stores menu categories.

`items`

Stores menu items and add-on items.

`adjustments`

Stores enabled or disabled cart-level additional charges, such as service charge, packaging fee, or delivery fee. Discounts are stored separately in `discountTemplates` and applied through the discount workflow.

`discountTemplates`

Stores reusable discount options.

`settings`

Stores register-wide settings. This is a singleton row with id `main`.

The settings row includes shop display customization:

- `shopName`
- `primaryColor`
- `secondaryColor`

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

`deviceRegistration`

Stores the singleton POS device registration state. The real `deviceId` is server-issued during token registration, not locally generated. The default row is unregistered and contains no device credentials.

`syncOutbox`

Stores durable local sync events created after local writes, such as transaction creation, served state, void state, and settings snapshots.

`syncState`

Stores singleton sync status metadata, including last successful sync, last failed sync, and last error.

## Important Singleton Rows

Settings:

```txt
settings.id = "main"
```

Device registration:

```txt
deviceRegistration.id = "main"
```

Sync state:

```txt
syncState.id = "main"
```

## Schema Indexes

Current version 15 indexes:

```ts
categories: "&id, name"
items: "&id, categoryId, name, isOutOfStock, isAddOn"
adjustments: "&id, label, enabled"
discountTemplates: "&id, label"
settings: "&id"
transactions: "&id, transactionNumber, createdAt, paymentMethod, ownerId, shopId, deviceId"
transactionItems: "&id, transactionId, itemId"
itemVariants: "&id, itemId, sortOrder"
modifiers: "&id, label"
itemModifiers: "&id, itemId, modifierId"
itemAddOns: "&id, itemId, addOnItemId"
deviceRegistration: "&id, registrationStatus, ownerId, shopId, deviceId"
syncOutbox: "&id, eventType, recordId, status, createdAt"
syncState: "&id"
```

## Seeding

`ensureDatabaseSeeded()` is responsible for default local data.

It ensures:

- Main settings row exists.
- Main device registration row exists with `registrationStatus = "unregistered"` if registration has not completed.
- Main sync state row exists.
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
- Add shop display customization fields.

## Snapshot Philosophy

Completed transactions should remain historically accurate.

For that reason, `transactionItems` stores snapshots:

- Item name at checkout.
- Item price at checkout.
- Category id and category name at checkout.
- Variant selected at checkout.
- Modifiers selected at checkout.
- Add-ons selected at checkout.
- Quantity and line total.

Do not make reports depend on live item records for historical transaction display.

## Checkout Persistence

Checkout creates:

- One `transactions` row.
- One or more `transactionItems` rows.
- One `syncOutbox` row for `transaction.created`.

These are written in a Dexie transaction.

After checkout, the store reloads the database snapshot and clears the cart.

## Void And Served State

Transactions are not edited for normal order changes after checkout.

Current mutable transaction fields are operational state:

- `isServed`
- `isVoided`
- `voidReason`
- `voidedAt`
- `updatedAt`

Voided transactions are excluded from report totals.

Serving or voiding a transaction creates a sync outbox entry in the same local mutation flow.

Settings, menu, payment option, VAT, discount, adjustment, and settings import changes create `settings.snapshot` outbox entries after local persistence succeeds. Snapshot payloads reuse the settings export format and do not change the local Dexie schema.

## Registration And Sync Metadata

Registration metadata includes:

- `registrationStatus`
- `ownerId`
- `ownerName`
- `businessName`
- `shopId`
- `shopCode`
- `deviceId`
- `deviceCode`
- `deviceName`
- `credentialId`
- `credentialSecret`
- `registeredAt`
- `lastSeenAt`

New transactions snapshot:

- `ownerId`
- `shopId`
- `deviceId`
- `shopCodeSnapshot`
- `deviceCodeSnapshot`
- `userId`
- `userNameSnapshot`
- `updatedAt`

Existing transactions from schema versions before 14 are backfilled with nullable owner/shop/device/user fields and `updatedAt = createdAt`.

Existing transaction items from schema versions before 15 are best-effort backfilled with category snapshots from the current item/category records. New transaction items snapshot category data at checkout so Sales by Category does not depend on later catalog edits.

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
