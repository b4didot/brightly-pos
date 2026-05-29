# Brightly POS — Architecture

## Overview

Brightly POS is a **local-first, tablet-first, responsive web application** built for
small food and beverage businesses. V0.5 is complete and running as an Android APK.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| UI Framework | React + TypeScript | Component-based, strongly typed |
| Build Tool | Vite | Fast dev startup, lightweight |
| Styling | Tailwind CSS | Responsive design without custom CSS |
| State Management | Zustand | Lightweight, simple, no boilerplate |
| Local Database | IndexedDB via Dexie | Local-first, offline capable |
| Icons | lucide-react | Consistent icon library |

---

## Architecture Style

- **Local-first** — All data lives in IndexedDB on the device. No backend, no internet required.
- **Tablet-first** — Designed primarily for tablet (768px), responsive down to mobile (375px) and up to desktop.
- **Web app** — Built as a web app, packaged as APK via Capacitor for Android.
- **Single store** — All global state lives in one Zustand store (`usePosStore`).

---

## Folder Structure

```
src/
├── components/          # Reusable components used across pages
│   ├── AppShell.tsx     # Root layout, nav, loading/error states
│   ├── CartSheet.tsx    # Sticky bottom cart panel (mobile) / sidebar (tablet+)
│   ├── Modal.tsx        # Generic modal wrapper
│   ├── NavButton.tsx    # Navigation tab button
│   ├── SectionHeader.tsx
│   └── TogglePill.tsx   # Toggle switch (ON/OFF pill)
│
├── pages/               # Full-page views
│   ├── OrderPage.tsx    # Orchestrates the ordering flow
│   ├── SettingsPage.tsx # Orchestrates all settings sections
│   ├── ReportPage.tsx   # Transaction history and reporting
│   │
│   ├── order/           # OrderPage sub-components
│   │   ├── MenuGrid.tsx       # Product tile grid with category filter
│   │   ├── CartPanel.tsx      # Cart line items, totals, checkout buttons
│   │   ├── PaymentModal.tsx   # Cash/card payment flow (multi-step)
│   │   ├── RemoveItemModal.tsx # Confirm item removal from cart
│   │   └── OrderUi.tsx        # Shared UI primitives (IconButton, etc.)
│   │
│   └── settings/        # SettingsPage sub-components
│       ├── CollapsibleSection.tsx  # Expandable section wrapper
│       ├── CategoriesSection.tsx   # Manage categories
│       ├── ItemsSection.tsx        # Manage items
│       ├── AdjustmentsSection.tsx  # Manage tax/service charges
│       ├── VatSection.tsx          # VAT settings
│       ├── PaymentOptionsSection.tsx # Cash/Card toggles
│       ├── SettingRow.tsx          # Reusable setting row layout
│       ├── StatusPill.tsx          # Status badge (active/inactive)
│       └── ToggleRow.tsx           # Setting row with toggle
│
├── store/
│   └── usePosStore.ts   # Single Zustand store (all global state + actions)
│
├── db/
│   └── database.ts      # Dexie database class + schema versions + seed logic
│
├── types/
│   └── index.ts         # All TypeScript types (domain models)
│
├── utils/
│   ├── cart.ts          # Cart total calculations
│   ├── dates.ts         # Date formatting helpers
│   ├── download.ts      # CSV/XLSX export helpers
│   ├── id.ts            # ID generation (createId)
│   ├── money.ts         # Peso formatting (formatPeso, parsePesoInput)
│   └── vat.ts           # VAT calculation (inclusive mode)
│
├── constants/
│   └── catalog.ts       # Seed data: default categories and items
│
└── assets/              # Static files (images, SVGs)
```

---

## Data Models

All types live in `src/types/index.ts`.

```typescript
// Categories for grouping items
type Category = {
  id: string;
  name: string;
  defaultColor: string;    // Hex color for UI
  createdAt: string;       // ISO string
};

// Menu items
type Item = {
  id: string;
  name: string;
  price: number;           // In PHP (pesos), inclusive of VAT if enabled
  categoryId: string | null;
  isOutOfStock: boolean;   // Hidden from menu when true
  createdAt: string;
};

// Tax/service charge adjustments
type Adjustment = {
  id: string;
  label: string;           // e.g. "Service Charge"
  type: "percentage" | "flat";
  value: number;
  enabled: boolean;        // Auto-apply if enabled
  createdAt: string;
};

// App-wide settings (singleton, id: "main")
type Settings = {
  id: "main";
  cashEnabled: boolean;
  cardEnabled: boolean;
  vatEnabled: boolean;
  vatPercentage: number;   // Default: 12
  vatInclusive: boolean;   // Always true (VAT included in item price)
};

// Active cart state (in-memory only, not persisted)
type CartLine = {
  itemId: string;
  quantity: number;
};

// Completed transaction (persisted)
type Transaction = {
  id: string;
  transactionNumber: string;  // Format: BRT-YYYYMMDD-001
  createdAt: string;
  paymentMethod: "cash" | "card";
  referenceId: string;
  subtotal: number;
  adjustments: AppliedAdjustment[];
  paymentAmount: number;
  changeAmount: number;
  totalAmount: number;
  vatEnabled: boolean;
  vatPercentage: number;
  vatInclusive: boolean;
  vatableSales: number;        // Net sales (ex-VAT)
  vatAmount: number;           // VAT amount collected
};

// Line items per transaction (for detailed reporting)
type TransactionItem = {
  id: string;
  transactionId: string;
  itemId: string;
  itemNameSnapshot: string;   // Name at time of sale (in case item is renamed)
  itemPriceSnapshot: number;  // Price at time of sale
  quantity: number;
  lineTotal: number;
};
```

---

## Database (Dexie / IndexedDB)

**Database name:** `brightly-pos-v0`
**Current schema version:** 3

```typescript
// Tables and indexes
categories:     "&id, name"
items:          "&id, categoryId, name, isOutOfStock"
adjustments:    "&id, label, enabled"
settings:       "&id"
transactions:   "&id, transactionNumber, createdAt, paymentMethod"
transactionItems: "&id, transactionId, itemId"
```

**Versioning pattern:**
- Each schema change bumps the version number
- Migrations run in `.upgrade()` callbacks
- `ensureDatabaseSeeded()` runs on app load to set defaults and seed data

**ID format:** `createId("prefix")` → e.g., `item_xyz123`, `cat_abc456`, `txn_def789`

---

## State Management (Zustand)

**Single store:** `usePosStore` in `src/store/usePosStore.ts`

### State Shape
```typescript
// UI
activeView: "order" | "settings" | "report"

// Data (loaded from Dexie on app start)
categories: Category[]
items: Item[]
adjustments: Adjustment[]
settings: Settings
transactions: Transaction[]
transactionItems: TransactionItem[]

// Active session
cart: CartLine[]
selectedCategoryId: string    // "all" | "uncategorized" | categoryId

// Loading
loading: boolean
loadError: string

// Report
reportStartDate: string
reportEndDate: string
```

### Key Actions
```typescript
load()                          // Load all data from Dexie on startup
resetLocalData()                // Clear and re-seed database
addToCart(itemId)               // Add item or increment existing
incrementCartLine(itemId)
decrementCartLine(itemId)       // Removes line if quantity reaches 0
removeCartLine(itemId)
clearCart()
checkout({ paymentMethod, paymentAmount, referenceId })  // Persist transaction
saveCategory({ id?, name, defaultColor })               // Create or update
deleteCategory(categoryId)      // Also uncategorizes linked items
saveItem({ id?, name, price, categoryId })
deleteItem(itemId)              // Also removes from active cart
toggleItemOutOfStock(itemId)
saveAdjustment({ id?, label, type, value, enabled })
deleteAdjustment(adjustmentId)
setPaymentMethodEnabled(method, enabled)
updateVatSettings({ vatEnabled, vatPercentage })
setReportRange(startDate, endDate)
```

### State Refresh Pattern
After every database mutation, the store calls `loadSnapshot()` to reload all related
data from Dexie and sync state. This ensures consistency across all components.

---

## Component Patterns

### Functional Components with Hooks
```typescript
export function ComponentName() {
  // 1. Store selectors
  const items = usePosStore((state) => state.items);
  const addToCart = usePosStore((state) => state.addToCart);

  // 2. Local state
  const [isOpen, setIsOpen] = useState(false);

  // 3. Computed values
  const filteredItems = useMemo(() => items.filter(...), [items]);

  // 4. Handlers (named functions, not arrow functions inline)
  function handleAction() { ... }

  // 5. Render
  return (...);
}
```

### Page vs Component
- **Pages** (`/pages`) — Full views. May hold local state that orchestrates sub-components.
- **Components** (`/components`) — Reusable across pages. Accept props, no direct store access preferred.
- **Sub-components** (`/pages/order/`, `/pages/settings/`) — Scoped to their parent page. Can access store directly.

### Modal Pattern
```typescript
// Local state in parent
const [isModalOpen, setIsModalOpen] = useState(false);

// Modal usage
<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="...">
  {/* form or confirmation content */}
</Modal>
```

### Zustand Selector Pattern
Always select individual values, not the whole store:
```typescript
// ✅ Correct
const items = usePosStore((state) => state.items);

// ❌ Avoid (causes unnecessary re-renders)
const store = usePosStore();
```

---

## Styling Conventions

- **Tailwind CSS only** — No custom CSS files except `index.css` for base resets
- **Mobile-first** — Base styles for mobile, then `md:` and `lg:` for larger screens
- **Color palette:** stone (neutral), amber (brand/accent), red (danger/error), green (success)
- **Spacing:** Use Tailwind scale (`p-4`, `gap-4`, etc.), avoid arbitrary values
- **Buttons:** Always `type="button"` unless inside a form needing submit

### Responsive Breakpoints
```
Mobile:  < 640px  (base styles)
Tablet:  md: 768px
Desktop: lg: 1024px
```

### Common UI Patterns
```typescript
// Card container
<div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">

// Primary button
<button className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white">

// Secondary button
<button className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold">

// Danger button
<button className="min-h-11 rounded-lg bg-red-600 px-4 font-bold text-white">
```

---

## VAT Implementation

Brightly POS uses **inclusive VAT only** (VAT is included in the item price).

**Example (12% VAT on ₱100 item):**
```
Item price:  ₱100.00  (customer pays this)
VAT amount:  ₱10.71   (100 / 1.12 × 0.12)
Net sales:   ₱89.29   (100 / 1.12)
```

VAT is calculated on `totalAmount` at checkout, not per item.
VAT breakdown is snapshotted into each `Transaction` record.

---

## Utilities

| File | Purpose |
|---|---|
| `cart.ts` | `calculateCartTotals(cart, items, adjustments)` → subtotal, adjustments, total |
| `money.ts` | `formatPeso(amount)` → "₱1,234.00", `parsePesoInput(str)` → number |
| `dates.ts` | `toDateInputValue(date)` → "YYYY-MM-DD", `compactDateKey(date)` → "20260529" |
| `id.ts` | `createId("prefix")` → unique prefixed ID string |
| `vat.ts` | `calculateInclusiveVat(total, settings)` → VatBreakdown |
| `download.ts` | CSV / XLSX export for reports |

---

## Navigation

Three views, managed by `activeView` in the store:
- `"order"` — OrderPage (default)
- `"settings"` — SettingsPage
- `"report"` — ReportPage

Navigation lives in `AppShell.tsx` header.

---

## V0.5 Status (Completed)

- ✅ Out-of-stock flag on items (hidden from menu, toggleable in settings)
- ✅ Settings page collapsible sections
- ✅ Mobile responsive overflow fixes
- ✅ Add/Edit/Delete modals for categories, items, adjustments
- ✅ Order feedback animation (item tile animation on add to cart)
- ✅ Mobile sticky CartSheet (collapsed summary → expand to full cart)
- ✅ VAT toggle pill (replaces checkboxes)
- ✅ SettingsPage refactored into sub-components
- ✅ OrderPage refactored into sub-components

---

## V1 Planned Features

- [ ] Add-ons system (link add-ons to items, shown as modal at checkout)
- [ ] Discounts (templated + manual, applied at checkout)
- [ ] Enhanced dashboard (daily/weekly/monthly comparisons, better reporting visuals)
- [ ] VAT exclusive mode (VAT added on top of item price at checkout)
