import { create } from "zustand";
import { seedCategories, seedItems } from "../constants/catalog";
import { db, ensureDatabaseSeeded, resetDatabase } from "../db/database";
import { calculateCartTotals } from "../utils/cart";
import { compactDateKey, toDateInputValue } from "../utils/dates";
import { createId } from "../utils/id";
import { calculateInclusiveVat, defaultVatSettings } from "../utils/vat";
import type {
  Adjustment,
  CartLine,
  Category,
  Item,
  PaymentMethod,
  Settings,
  Transaction,
  TransactionItem,
  ViewName,
} from "../types";

type PosState = {
  activeView: ViewName;
  categories: Category[];
  items: Item[];
  adjustments: Adjustment[];
  settings: Settings;
  transactions: Transaction[];
  transactionItems: TransactionItem[];
  cart: CartLine[];
  selectedCategoryId: string;
  loading: boolean;
  loadError: string;
  reportStartDate: string;
  reportEndDate: string;
  setActiveView: (view: ViewName) => void;
  load: () => Promise<void>;
  resetLocalData: () => Promise<void>;
  setSelectedCategoryId: (categoryId: string) => void;
  addToCart: (itemId: string) => void;
  incrementCartLine: (itemId: string) => void;
  decrementCartLine: (itemId: string) => void;
  removeCartLine: (itemId: string) => void;
  clearCart: () => void;
  checkout: (input: {
    paymentMethod: PaymentMethod;
    paymentAmount: number;
    referenceId: string;
    transactionId?: string;
  }) => Promise<Transaction>;
  saveCategory: (category: Pick<Category, "name" | "defaultColor"> & { id?: string }) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  saveItem: (item: Pick<Item, "name" | "price" | "categoryId"> & { id?: string }) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  saveAdjustment: (
    adjustment: Pick<Adjustment, "label" | "type" | "value" | "enabled"> & { id?: string },
  ) => Promise<void>;
  deleteAdjustment: (adjustmentId: string) => Promise<void>;
  setPaymentMethodEnabled: (method: PaymentMethod, enabled: boolean) => Promise<void>;
  updateVatSettings: (settings: Pick<Settings, "vatEnabled" | "vatPercentage" | "vatInclusive">) => Promise<void>;
  setReportRange: (startDate: string, endDate: string) => void;
};

const today = toDateInputValue(new Date());
const defaultSettings: Settings = {
  id: "main",
  cashEnabled: true,
  cardEnabled: true,
  ...defaultVatSettings,
};

const seedCategoryOrder = new Map(seedCategories.map((category, index) => [category.id, index]));
const seedItemOrder = new Map(seedItems.map((item, index) => [item.id, index]));

function compareByStoredOrder<T extends { createdAt: string; id: string; name: string }>(
  left: T,
  right: T,
  seedOrder: Map<string, number>,
) {
  const leftSeedOrder = seedOrder.get(left.id);
  const rightSeedOrder = seedOrder.get(right.id);

  if (leftSeedOrder !== undefined || rightSeedOrder !== undefined) {
    return (leftSeedOrder ?? Number.MAX_SAFE_INTEGER) - (rightSeedOrder ?? Number.MAX_SAFE_INTEGER);
  }

  return left.createdAt.localeCompare(right.createdAt) || left.name.localeCompare(right.name);
}

function sortCategories(categories: Category[]) {
  return [...categories].sort((left, right) => compareByStoredOrder(left, right, seedCategoryOrder));
}

function sortItemsByCategoryOrder(items: Item[], categories: Category[]) {
  const categoryOrder = new Map(categories.map((category, index) => [category.id, index]));

  return [...items].sort((left, right) => {
    const leftCategoryOrder =
      left.categoryId === null ? Number.MAX_SAFE_INTEGER : categoryOrder.get(left.categoryId) ?? Number.MAX_SAFE_INTEGER;
    const rightCategoryOrder =
      right.categoryId === null ? Number.MAX_SAFE_INTEGER : categoryOrder.get(right.categoryId) ?? Number.MAX_SAFE_INTEGER;

    return (
      leftCategoryOrder - rightCategoryOrder ||
      compareByStoredOrder(left, right, seedItemOrder)
    );
  });
}

async function loadSnapshot() {
  await ensureDatabaseSeeded();

  const [rawCategories, rawItems, adjustments, settings, transactions, transactionItems] =
    await Promise.all([
      db.categories.toArray(),
      db.items.toArray(),
      db.adjustments.orderBy("label").toArray(),
      db.settings.get("main"),
      db.transactions.orderBy("createdAt").reverse().toArray(),
      db.transactionItems.toArray(),
    ]);
  const categories = sortCategories(rawCategories);
  const items = sortItemsByCategoryOrder(rawItems, categories);

  return {
    categories,
    items,
    adjustments,
    settings: { ...defaultSettings, ...settings },
    transactions,
    transactionItems,
  };
}

function withLoadTimeout<T>(promise: Promise<T>) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("Local database did not respond. Retry or reset local data."));
      }, 8000);
    }),
  ]);
}

async function createTransactionNumber(createdAt: Date) {
  const key = compactDateKey(createdAt);
  const dayStart = new Date(createdAt);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(createdAt);
  dayEnd.setHours(23, 59, 59, 999);

  const count = await db.transactions
    .where("createdAt")
    .between(dayStart.toISOString(), dayEnd.toISOString(), true, true)
    .count();

  return `BRT-${key}-${String(count + 1).padStart(3, "0")}`;
}

export const usePosStore = create<PosState>((set, get) => ({
  activeView: "order",
  categories: [],
  items: [],
  adjustments: [],
  settings: defaultSettings,
  transactions: [],
  transactionItems: [],
  cart: [],
  selectedCategoryId: "all",
  loading: true,
  loadError: "",
  reportStartDate: today,
  reportEndDate: today,
  setActiveView: (activeView) => set({ activeView }),
  load: async () => {
    set({ loading: true, loadError: "" });

    try {
      const snapshot = await withLoadTimeout(loadSnapshot());
      set({ ...snapshot, loading: false, loadError: "" });
    } catch (error) {
      set({
        loading: false,
        loadError:
          error instanceof Error
            ? error.message
            : "Unable to open the local register database.",
      });
    }
  },
  resetLocalData: async () => {
    set({ loading: true, loadError: "" });

    try {
      await resetDatabase();
      const snapshot = await withLoadTimeout(loadSnapshot());
      set({ ...snapshot, cart: [], selectedCategoryId: "all", loading: false, loadError: "" });
    } catch (error) {
      set({
        loading: false,
        loadError:
          error instanceof Error
            ? error.message
            : "Unable to reset the local register database.",
      });
    }
  },
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),
  addToCart: (itemId) => {
    const existingLine = get().cart.find((line) => line.itemId === itemId);

    if (existingLine) {
      set({
        cart: get().cart.map((line) =>
          line.itemId === itemId ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      });
      return;
    }

    set({ cart: [...get().cart, { itemId, quantity: 1 }] });
  },
  incrementCartLine: (itemId) => {
    set({
      cart: get().cart.map((line) =>
        line.itemId === itemId ? { ...line, quantity: line.quantity + 1 } : line,
      ),
    });
  },
  decrementCartLine: (itemId) => {
    set({
      cart: get()
        .cart.map((line) =>
          line.itemId === itemId ? { ...line, quantity: Math.max(0, line.quantity - 1) } : line,
        )
        .filter((line) => line.quantity > 0),
    });
  },
  removeCartLine: (itemId) => {
    set({ cart: get().cart.filter((line) => line.itemId !== itemId) });
  },
  clearCart: () => set({ cart: [] }),
  checkout: async ({ paymentMethod, paymentAmount, referenceId, transactionId: providedTransactionId }) => {
    const state = get();
    const totals = calculateCartTotals(state.cart, state.items, state.adjustments);

    if (state.cart.length === 0 || totals.total <= 0) {
      throw new Error("Add at least one item before checkout.");
    }

    if (paymentMethod === "cash" && paymentAmount < totals.total) {
      throw new Error("Cash received must cover the total.");
    }

    const now = new Date();
    const transactionId = providedTransactionId ?? createId("txn");
    const vatBreakdown = calculateInclusiveVat(totals.total, state.settings);
    const transaction: Transaction = {
      id: transactionId,
      transactionNumber: await createTransactionNumber(now),
      createdAt: now.toISOString(),
      paymentMethod,
      referenceId: referenceId.trim(),
      subtotal: totals.subtotal,
      adjustments: totals.appliedAdjustments,
      paymentAmount: paymentMethod === "card" ? totals.total : paymentAmount,
      changeAmount: paymentMethod === "card" ? 0 : Math.max(0, paymentAmount - totals.total),
      totalAmount: totals.total,
      ...vatBreakdown,
    };

    const transactionItems: TransactionItem[] = state.cart.flatMap((line) => {
      const item = state.items.find((entry) => entry.id === line.itemId);

      if (!item) {
        return [];
      }

      return {
        id: createId("txni"),
        transactionId,
        itemId: item.id,
        itemNameSnapshot: item.name,
        itemPriceSnapshot: item.price,
        quantity: line.quantity,
        lineTotal: item.price * line.quantity,
      };
    });

    await db.transaction("rw", db.transactions, db.transactionItems, async () => {
      await db.transactions.add(transaction);
      await db.transactionItems.bulkAdd(transactionItems);
    });

    const snapshot = await loadSnapshot();
    set({ ...snapshot, cart: [] });

    return transaction;
  },
  saveCategory: async ({ id, name, defaultColor }) => {
    const category: Category = {
      id: id ?? createId("cat"),
      name: name.trim(),
      defaultColor,
      createdAt: new Date().toISOString(),
    };

    await db.categories.put(category);
    set(await loadSnapshot());
  },
  deleteCategory: async (categoryId) => {
    await db.transaction("rw", db.categories, db.items, async () => {
      await db.categories.delete(categoryId);
      const assignedItems = await db.items.where("categoryId").equals(categoryId).toArray();
      await Promise.all(
        assignedItems.map((item) => db.items.update(item.id, { categoryId: null })),
      );
    });
    set({ ...(await loadSnapshot()), selectedCategoryId: "all" });
  },
  saveItem: async ({ id, name, price, categoryId }) => {
    const item: Item = {
      id: id ?? createId("item"),
      name: name.trim(),
      price,
      categoryId,
      createdAt: new Date().toISOString(),
    };

    await db.items.put(item);
    set(await loadSnapshot());
  },
  deleteItem: async (itemId) => {
    await db.items.delete(itemId);
    set({
      ...(await loadSnapshot()),
      cart: get().cart.filter((line) => line.itemId !== itemId),
    });
  },
  saveAdjustment: async ({ id, label, type, value, enabled }) => {
    const adjustment: Adjustment = {
      id: id ?? createId("adj"),
      label: label.trim(),
      type,
      value,
      enabled,
      createdAt: new Date().toISOString(),
    };

    await db.adjustments.put(adjustment);
    set(await loadSnapshot());
  },
  deleteAdjustment: async (adjustmentId) => {
    await db.adjustments.delete(adjustmentId);
    set(await loadSnapshot());
  },
  setPaymentMethodEnabled: async (method, enabled) => {
    const settings = get().settings;
    const nextSettings: Settings = {
      ...settings,
      cashEnabled: method === "cash" ? enabled : settings.cashEnabled,
      cardEnabled: method === "card" ? enabled : settings.cardEnabled,
    };

    if (!nextSettings.cashEnabled && !nextSettings.cardEnabled) {
      return;
    }

    await db.settings.put(nextSettings);
    set({ settings: nextSettings });
  },
  updateVatSettings: async (vatSettings) => {
    const settings = get().settings;
    const nextSettings: Settings = {
      ...settings,
      vatEnabled: vatSettings.vatEnabled,
      vatPercentage: Math.max(0, vatSettings.vatPercentage),
      vatInclusive: vatSettings.vatInclusive,
    };

    await db.settings.put(nextSettings);
    set({ settings: nextSettings });
  },
  setReportRange: (reportStartDate, reportEndDate) => {
    set({ reportStartDate, reportEndDate });
  },
}));
