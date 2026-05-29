---
description: Utility function patterns and organization
---

# Utility Functions

## Organization

- Utilities organized by feature: /utils/cart.ts, /utils/money.ts, /utils/dates.ts, etc.
- Each file exports pure, typed functions
- All functions have clear TypeScript types

## Pure Functions

- Utilities should be pure (no side effects)
- Accept data as parameters, return computed results
- Example:

```ts
export function calculateCartTotals(cart: CartLine[], items: Item[], adjustments: Adjustment[]): CartTotals {
	// pure function logic
	return { subtotal, appliedAdjustments, adjustmentsTotal, total };
}
```

## Naming Conventions

- Utility functions use camelCase: calculateCartTotals, formatPeso, createId
- Be descriptive: formatPeso is better than format
- Include return type in name if helpful: calculateCartTotals, createId

## Type Safety

- All parameters must be typed
- All return values must be typed
- Use type imports for domain models
- Example:

```ts
import type { CartLine, Item, Adjustment, CartTotals } from "../types";

export function calculateCartTotals(
  cart: CartLine[],
  items: Item[],
  adjustments: Adjustment[],
): CartTotals { ... }
```
