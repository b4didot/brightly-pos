import { create } from "zustand";
import { seedCategories, seedItems } from "../constants/catalog";
import { db, ensureDatabaseSeeded, resetDatabase } from "../db/database";
import { calculateCartTotals } from "../utils/cart";
import { compactDateKey, toDateInputValue } from "../utils/dates";
import { createId } from "../utils/id";
import { calculateInclusiveVat, defaultVatSettings } from "../utils/vat";
import type {
  Adjustment,
  AppliedDiscount,
  CartLine,
  Category,
  DiscountTemplate,
  Item,
  ItemAddOn,
  ItemModifier,
  ItemVariant,
  Modifier,
  OrderType,
  PaymentMethod,
  SelectedModifier,
  SelectedAddOn,
  Settings,
  Transaction,
  TransactionItem,
  ViewName,
} from "../types";

type PosState = {
  activeView: ViewName;
  categories: Category[];
  items: Item[];
  itemVariants: ItemVariant[];
  modifiers: Modifier[];
  itemModifiers: ItemModifier[];
  itemAddOns: ItemAddOn[];
  adjustments: Adjustment[];
  discountTemplates: DiscountTemplate[];
  settings: Settings;
  transactions: Transaction[];
  transactionItems: TransactionItem[];
  cart: CartLine[];
  cartDiscount: AppliedDiscount | null;
  selectedCategoryId: string;
  pendingOrderType: OrderType;
  loading: boolean;
  loadError: string;
  reportStartDate: string;
  reportEndDate: string;
  setActiveView: (view: ViewName) => void;
  load: () => Promise<void>;
  resetLocalData: () => Promise<void>;
  setSelectedCategoryId: (categoryId: string) => void;
  setPendingOrderType: (orderType: OrderType) => void;
  addToCart: (itemId: string) => void;
  addToCartWithCustomization: (input: {
    itemId: string;
    variantId: string | null;
    variantName: string | null;
    variantPrice: number | null;
    selectedModifiers: SelectedModifier[];
    selectedAddOns: SelectedAddOn[];
  }) => void;
  incrementCartLine: (cartLineId: string) => void;
  decrementCartLine: (cartLineId: string) => void;
  removeCartLine: (cartLineId: string) => void;
  clearCart: () => void;
  applyCartDiscount: (discount: AppliedDiscount) => void;
  clearCartDiscount: () => void;
  checkout: (input: {
    paymentMethod: PaymentMethod;
    paymentAmount: number;
    referenceId: string;
    orderType: OrderType;
    transactionId?: string;
  }) => Promise<Transaction>;
  markTransactionServed: (transactionId: string) => Promise<void>;
  voidTransaction: (transactionId: string, reason: string) => Promise<void>;
  saveCategory: (category: Pick<Category, "name" | "defaultColor"> & { id?: string }) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  saveItem: (item: Pick<Item, "name" | "price" | "categoryId"> & { id?: string }) => Promise<void>;
  saveAddOnItem: (item: Pick<Item, "name" | "price"> & { id?: string }) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  toggleItemOutOfStock: (itemId: string) => Promise<void>;
  saveItemVariant: (variant: Pick<ItemVariant, "itemId" | "name" | "price" | "sortOrder"> & { id?: string }) => Promise<void>;
  deleteItemVariant: (variantId: string) => Promise<void>;
  saveModifier: (modifier: Pick<Modifier, "label" | "options"> & { id?: string }) => Promise<void>;
  deleteModifier: (modifierId: string) => Promise<void>;
  linkModifierToItem: (itemId: string, modifierId: string) => Promise<void>;
  unlinkModifierFromItem: (itemId: string, modifierId: string) => Promise<void>;
  linkAddOnToItem: (itemId: string, addOnItemId: string) => Promise<void>;
  unlinkAddOnFromItem: (itemId: string, addOnItemId: string) => Promise<void>;
  saveAdjustment: (
    adjustment: Pick<Adjustment, "label" | "type" | "value" | "enabled"> & { id?: string },
  ) => Promise<void>;
  deleteAdjustment: (adjustmentId: string) => Promise<void>;
  saveDiscountTemplate: (
    discount: Pick<DiscountTemplate, "label" | "type" | "value"> & { id?: string },
  ) => Promise<void>;
  deleteDiscountTemplate: (discountId: string) => Promise<void>;
  setPaymentMethodEnabled: (method: PaymentMethod, enabled: boolean) => Promise<void>;
  setDiscountsEnabled: (enabled: boolean) => Promise<void>;
  updateVatSettings: (settings: Pick<Settings, "vatEnabled" | "vatPercentage">) => Promise<void>;
  setReportRange: (startDate: string, endDate: string) => void;
};

const today = toDateInputValue(new Date());
const defaultSettings: Settings = {
  id: "main",
  cashEnabled: true,
  cardEnabled: true,
  ...defaultVatSettings,
  discountEnabled: true,
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

  const [
    rawCategories,
    rawItems,
    adjustments,
    discountTemplates,
    settings,
    transactions,
    transactionItems,
    itemVariants,
    modifiers,
    itemModifiers,
    itemAddOns,
  ] =
    await Promise.all([
      db.categories.toArray(),
      db.items.toArray(),
      db.adjustments.orderBy("label").toArray(),
      db.discountTemplates.orderBy("label").toArray(),
      db.settings.get("main"),
      db.transactions.orderBy("createdAt").reverse().toArray(),
      db.transactionItems.toArray(),
      db.itemVariants.orderBy("sortOrder").toArray(),
      db.modifiers.orderBy("label").toArray(),
      db.itemModifiers.toArray(),
      db.itemAddOns.toArray(),
    ]);
  const categories = sortCategories(rawCategories);
  const items = sortItemsByCategoryOrder(rawItems, categories);

  return {
    categories,
    items,
    adjustments,
    discountTemplates,
    settings: { ...defaultSettings, ...settings, vatInclusive: true },
    transactions,
    transactionItems,
    itemVariants,
    modifiers,
    itemModifiers,
    itemAddOns,
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
  itemVariants: [],
  modifiers: [],
  itemModifiers: [],
  itemAddOns: [],
  adjustments: [],
  discountTemplates: [],
  settings: defaultSettings,
  transactions: [],
  transactionItems: [],
  cart: [],
  cartDiscount: null,
  selectedCategoryId: "all",
  pendingOrderType: "dine-in",
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
      set({ ...snapshot, cart: [], cartDiscount: null, selectedCategoryId: "all", loading: false, loadError: "" });
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
  setPendingOrderType: (pendingOrderType) => set({ pendingOrderType }),
  addToCart: (itemId) => {
    const { items, cart } = get();
    const item = items.find((entry) => entry.id === itemId);

    if (!item || item.isOutOfStock) {
      return;
    }

    const existingLine = cart.find(
      (line) =>
        line.itemId === itemId &&
        line.variantId === null &&
        line.selectedModifiers.length === 0 &&
        line.selectedAddOns.length === 0,
    );

    if (existingLine) {
      set({
        cart: cart.map((line) =>
          line.id === existingLine.id ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      });
      return;
    }

    set({
      cart: [
        ...cart,
        {
          id: createId("cl"),
          itemId,
          quantity: 1,
          variantId: null,
          variantName: null,
          variantPrice: null,
          selectedModifiers: [],
          selectedAddOns: [],
        },
      ],
    });
  },
  addToCartWithCustomization: ({ itemId, variantId, variantName, variantPrice, selectedModifiers, selectedAddOns }) => {
    const { items, cart } = get();
    const item = items.find((entry) => entry.id === itemId);

    if (!item || item.isOutOfStock) {
      return;
    }

    const existingLine = cart.find(
      (line) =>
        line.itemId === itemId &&
        line.variantId === variantId &&
        line.selectedModifiers.length === selectedModifiers.length &&
        line.selectedAddOns.length === selectedAddOns.length &&
        line.selectedModifiers.every(
          (sm, i) =>
            sm.modifierId === selectedModifiers[i]?.modifierId &&
            sm.selectedOption === selectedModifiers[i]?.selectedOption,
        ) &&
        line.selectedAddOns.every((addOn, i) => addOn.itemId === selectedAddOns[i]?.itemId),
    );

    if (existingLine) {
      set({
        cart: cart.map((line) =>
          line.id === existingLine.id ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      });
      return;
    }

    set({
      cart: [
        ...cart,
        {
          id: createId("cl"),
          itemId,
          quantity: 1,
          variantId,
          variantName,
          variantPrice,
          selectedModifiers,
          selectedAddOns,
        },
      ],
    });
  },
  incrementCartLine: (cartLineId) => {
    const { cart, items } = get();
    const line = cart.find((entry) => entry.id === cartLineId);
    if (!line) return;
    const item = items.find((entry) => entry.id === line.itemId);

    if (!item || item.isOutOfStock) {
      return;
    }

    set({
      cart: cart.map((entry) =>
        entry.id === cartLineId ? { ...entry, quantity: entry.quantity + 1 } : entry,
      ),
    });
  },
  decrementCartLine: (cartLineId) => {
    const nextCart = get()
      .cart.map((entry) =>
        entry.id === cartLineId ? { ...entry, quantity: Math.max(0, entry.quantity - 1) } : entry,
      )
      .filter((entry) => entry.quantity > 0);

    set({
      cart: nextCart,
      cartDiscount: nextCart.length === 0 ? null : get().cartDiscount,
    });
  },
  removeCartLine: (cartLineId) => {
    const nextCart = get().cart.filter((line) => line.id !== cartLineId);
    set({
      cart: nextCart,
      cartDiscount: nextCart.length === 0 ? null : get().cartDiscount,
    });
  },
  clearCart: () => set({ cart: [], cartDiscount: null }),
  applyCartDiscount: (cartDiscount) => set({ cartDiscount }),
  clearCartDiscount: () => set({ cartDiscount: null }),
  checkout: async ({ paymentMethod, paymentAmount, referenceId, orderType, transactionId: providedTransactionId }) => {
    const state = get();
    const totals = calculateCartTotals(state.cart, state.items, state.adjustments, state.cartDiscount);

    if (state.cart.length === 0) {
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
      orderType,
      paymentMethod,
      referenceId: referenceId.trim(),
      subtotal: totals.subtotal,
      discount: totals.appliedDiscount,
      adjustments: totals.appliedAdjustments,
      paymentAmount: paymentMethod === "card" ? totals.total : paymentAmount,
      changeAmount: paymentMethod === "card" ? 0 : Math.max(0, paymentAmount - totals.total),
      totalAmount: totals.total,
      ...vatBreakdown,
      isServed: false,
      isVoided: false,
      voidReason: null,
      voidedAt: null,
    };

    const transactionItems: TransactionItem[] = state.cart.flatMap((line) => {
      const item = state.items.find((entry) => entry.id === line.itemId);

      if (!item) {
        return [];
      }

      const effectivePrice = line.variantPrice ?? item.price;
      const addOnsTotal = line.selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);

      return {
        id: createId("txni"),
        transactionId,
        itemId: item.id,
        itemNameSnapshot: item.name,
        itemPriceSnapshot: item.price,
        variantId: line.variantId,
        variantNameSnapshot: line.variantName,
        variantPriceSnapshot: line.variantPrice,
        selectedModifiers: line.selectedModifiers,
        selectedAddOns: line.selectedAddOns,
        quantity: line.quantity,
        lineTotal: (effectivePrice + addOnsTotal) * line.quantity,
      };
    });

    await db.transaction("rw", db.transactions, db.transactionItems, async () => {
      await db.transactions.add(transaction);
      await db.transactionItems.bulkAdd(transactionItems);
    });

    const snapshot = await loadSnapshot();
    set({ ...snapshot, cart: [], cartDiscount: null });

    return transaction;
  },
  markTransactionServed: async (transactionId) => {
    const transaction = await db.transactions.get(transactionId);

    if (!transaction || transaction.isVoided) {
      return;
    }

    await db.transactions.update(transactionId, { isServed: true });
    set(await loadSnapshot());
  },
  voidTransaction: async (transactionId, reason) => {
    const transaction = await db.transactions.get(transactionId);
    const trimmedReason = reason.trim();

    if (!transaction || transaction.isVoided || trimmedReason.length === 0) {
      return;
    }

    await db.transactions.update(transactionId, {
      isVoided: true,
      voidReason: trimmedReason,
      voidedAt: new Date().toISOString(),
    });
    set(await loadSnapshot());
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
    const existingItem = id ? await db.items.get(id) : null;
    const item: Item = {
      id: id ?? createId("item"),
      name: name.trim(),
      price,
      categoryId,
      isOutOfStock: existingItem?.isOutOfStock ?? false,
      isAddOn: existingItem?.isAddOn ?? false,
      createdAt: new Date().toISOString(),
    };

    await db.items.put(item);
    set(await loadSnapshot());
  },
  saveAddOnItem: async ({ id, name, price }) => {
    const existingItem = id ? await db.items.get(id) : null;
    const item: Item = {
      id: id ?? createId("item"),
      name: name.trim(),
      price,
      categoryId: null,
      isOutOfStock: existingItem?.isOutOfStock ?? false,
      isAddOn: true,
      createdAt: existingItem?.createdAt ?? new Date().toISOString(),
    };

    await db.items.put(item);
    set(await loadSnapshot());
  },
  deleteItem: async (itemId) => {
    await db.items.delete(itemId);
    await db.itemVariants.where("itemId").equals(itemId).delete();
    await db.itemModifiers.where("itemId").equals(itemId).delete();
    await db.itemAddOns.where("itemId").equals(itemId).delete();
    await db.itemAddOns.where("addOnItemId").equals(itemId).delete();
    set({
      ...(await loadSnapshot()),
      cart: get().cart.filter((line) => line.itemId !== itemId),
    });
  },
  toggleItemOutOfStock: async (itemId) => {
    const item = await db.items.get(itemId);

    if (!item) {
      return;
    }

    await db.items.update(itemId, { isOutOfStock: !item.isOutOfStock });
    set(await loadSnapshot());
  },
  saveItemVariant: async ({ id, itemId, name, price, sortOrder }) => {
    const existingVariant = id ? await db.itemVariants.get(id) : null;
    const variant: ItemVariant = {
      id: id ?? createId("var"),
      itemId,
      name: name.trim(),
      price,
      sortOrder,
      createdAt: existingVariant?.createdAt ?? new Date().toISOString(),
    };

    await db.itemVariants.put(variant);
    set(await loadSnapshot());
  },
  deleteItemVariant: async (variantId) => {
    await db.itemVariants.delete(variantId);
    set({
      ...(await loadSnapshot()),
      cart: get().cart.filter((line) => line.variantId !== variantId),
    });
  },
  saveModifier: async ({ id, label, options }) => {
    const existingModifier = id ? await db.modifiers.get(id) : null;
    const modifier: Modifier = {
      id: id ?? createId("mod"),
      label: label.trim(),
      options,
      createdAt: existingModifier?.createdAt ?? new Date().toISOString(),
    };

    await db.modifiers.put(modifier);
    set(await loadSnapshot());
  },
  deleteModifier: async (modifierId) => {
    await db.itemModifiers.where("modifierId").equals(modifierId).delete();
    await db.modifiers.delete(modifierId);
    set(await loadSnapshot());
  },
  linkModifierToItem: async (itemId, modifierId) => {
    const existing = await db.itemModifiers
      .where("itemId")
      .equals(itemId)
      .filter((itemModifier) => itemModifier.modifierId === modifierId)
      .first();

    if (existing) {
      return;
    }

    await db.itemModifiers.add({ id: createId("im"), itemId, modifierId });
    set(await loadSnapshot());
  },
  unlinkModifierFromItem: async (itemId, modifierId) => {
    await db.itemModifiers
      .where("itemId")
      .equals(itemId)
      .filter((itemModifier) => itemModifier.modifierId === modifierId)
      .delete();
    set(await loadSnapshot());
  },
  linkAddOnToItem: async (itemId, addOnItemId) => {
    if (itemId === addOnItemId) {
      return;
    }

    const existing = await db.itemAddOns
      .where("itemId")
      .equals(itemId)
      .filter((itemAddOn) => itemAddOn.addOnItemId === addOnItemId)
      .first();

    if (existing) {
      return;
    }

    await db.itemAddOns.add({ id: createId("iao"), itemId, addOnItemId });
    set(await loadSnapshot());
  },
  unlinkAddOnFromItem: async (itemId, addOnItemId) => {
    await db.itemAddOns
      .where("itemId")
      .equals(itemId)
      .filter((itemAddOn) => itemAddOn.addOnItemId === addOnItemId)
      .delete();
    set(await loadSnapshot());
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
  saveDiscountTemplate: async ({ id, label, type, value }) => {
    const existingDiscount = id ? await db.discountTemplates.get(id) : null;
    const discount: DiscountTemplate = {
      id: id ?? createId("disc"),
      label: label.trim(),
      type,
      value,
      createdAt: existingDiscount?.createdAt ?? new Date().toISOString(),
    };

    await db.discountTemplates.put(discount);
    set(await loadSnapshot());
  },
  deleteDiscountTemplate: async (discountId) => {
    await db.discountTemplates.delete(discountId);
    const cartDiscount = get().cartDiscount;
    set({
      ...(await loadSnapshot()),
      cartDiscount: cartDiscount?.discountId === discountId ? null : cartDiscount,
    });
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
  setDiscountsEnabled: async (enabled) => {
    const settings = get().settings;
    const nextSettings: Settings = {
      ...settings,
      discountEnabled: enabled,
    };

    await db.settings.put(nextSettings);
    set({ settings: nextSettings, cartDiscount: enabled ? get().cartDiscount : null });
  },
  updateVatSettings: async (vatSettings) => {
    const settings = get().settings;
    const nextSettings: Settings = {
      ...settings,
      vatEnabled: vatSettings.vatEnabled,
      vatPercentage: Math.max(0, vatSettings.vatPercentage),
      vatInclusive: true,
    };

    await db.settings.put(nextSettings);
    set({ settings: nextSettings });
  },
  setReportRange: (reportStartDate, reportEndDate) => {
    set({ reportStartDate, reportEndDate });
  },
}));
