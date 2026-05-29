---
description: Zustand store patterns and state management for Brightly POS
---

# State Management with Zustand

## Store Structure

- Single store: usePosStore (in /store/usePosStore.ts)
- Organized by domain: cart, items, categories, settings, transactions, ui
- All state is strongly typed with TypeScript

## Store Selector Pattern

- Always use selectors to extract specific state: `usePosStore((state) => state.field)`
- This ensures components only re-render when their specific slice changes
- Example:

```tsx
const items = usePosStore((state) => state.items);
const addToCart = usePosStore((state) => state.addToCart);
```

## Actions in Store

- Actions can be synchronous or async
- Async actions interact with Dexie database
- Always use `set()` to update state
- Use `get()` to read current state when needed
- Use `loadSnapshot()` pattern after database operations to refresh all related state

## Zustand Action Pattern

```ts
export const usePosStore = create<PosState>((set, get) => ({
  // State
  items: [],

  // Actions
  saveItem: async ({ id, name, price, categoryId }) => {
    const item: Item = { id: id ?? createId("item"), name, price, categoryId, ... };
    await db.items.put(item);
    set(await loadSnapshot()); // Refresh state from database
  },
}));
```

## Loading & Error States

- Use loading and loadError state for async operations
- Show loading UI while fetching data
- Display errors without crashing the app
- Provide retry mechanism for users
