---
description: Dexie database patterns and async data handling
---

# Database with Dexie

## Database Pattern

- All database interactions happen in Zustand actions
- Wrap database operations in try-catch blocks
- Use async/await for all Dexie queries

## Error Handling

```ts
try {
	const items = await db.items.where("category").equals(categoryId).toArray();
	set({ items, loading: false });
} catch (error) {
	const message = error instanceof Error ? error.message : "Unknown error";
	set({ error: message, loading: false });
}
```

## Transactions

- Use Dexie transactions for operations that span multiple tables
- Example: deleting a category should remove category and update items

```ts
await db.transaction("rw", db.categories, db.items, async () => {
	await db.categories.delete(categoryId);
	const items = await db.items.where("categoryId").equals(categoryId).toArray();
	await Promise.all(items.map((item) => db.items.update(item.id, { categoryId: null })));
});
```

## Loading Snapshots

- After any modification, load the complete snapshot
- This ensures all related state is in sync

```ts
const snapshot = await loadSnapshot();
set({ ...snapshot, loading: false });
```

## ID Generation

- Use createId utility for new IDs: `createId("item")`, `createId("cat")`, `createId("txn")`
- Each entity type has a prefix: item, cat, adj, txn, txni
