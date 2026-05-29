---
description: React component structure and TypeScript patterns for Brightly POS
---

# React & TypeScript Components

## Component Patterns

- Always use functional components with hooks (useState, useMemo, useCallback)
- Component file names use PascalCase (AppShell.tsx, OrderPage.tsx, NavButton.tsx)
- Components are organized in folders: /components (reusable) and /pages (pages)
- Each component should have a single responsibility

## TypeScript

- All components must be typed with TypeScript (.tsx files)
- Import types from '@/types' for domain models
- Use type imports: `import type { Item, Category } from '@/types'`
- Create local types for component-specific state (e.g., `type CashStep = "tender" | "change" | "complete"`)

## Component Structure

```tsx
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePosStore } from "../store/usePosStore";
import type { Item } from "../types";

export function ComponentName() {
	// 1. Extract from store with selectors
	const items = usePosStore((state) => state.items);
	const addToCart = usePosStore((state) => state.addToCart);

	// 2. Local state
	const [isOpen, setIsOpen] = useState(false);

	// 3. Computed values
	const filteredItems = useMemo(() => {
		return items.filter(/* condition */);
	}, [items]);

	// 4. Handlers
	function handleAction() {
		// logic
	}

	// 5. Render
	return <div>{/* JSX */}</div>;
}
```

## Icon Library

- Use lucide-react for icons: `import { Check, Plus, Trash2 } from "lucide-react"`
- Set appropriate icon sizes based on context

## Error Handling

- Use try-catch for async operations
- Store error state and display user-friendly messages
- Never expose internal error details to users
