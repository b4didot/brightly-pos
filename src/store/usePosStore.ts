import { create } from "zustand";
import { seedCategories, seedItems } from "../constants/catalog";
import {
  db,
  defaultDeviceRegistration,
  defaultShopSettings,
  defaultSyncState,
  ensureDatabaseSeeded,
  resetDatabase,
} from "../db/database";
import { consumeRegistrationToken } from "../services/ownerPortal";
import { createSettingsExport, importSettingsExport } from "../services/settingsTransfer";
import { updateConfigSyncRequestStatus, uploadSyncOutbox } from "../services/syncClient";
import { calculateCartTotals } from "../utils/cart";
import { toDateInputValue } from "../utils/dates";
import { createId } from "../utils/id";
import { calculateInclusiveVat, defaultVatSettings } from "../utils/vat";
import type {
  Adjustment,
  AppliedDiscount,
  CartLine,
  Category,
  DeviceRegistration,
  DeviceConfigSyncRequest,
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
  SyncOutboxEntry,
  SyncState,
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
  deviceRegistration: DeviceRegistration;
  syncState: SyncState;
  syncOutbox: SyncOutboxEntry[];
  pendingConfigSyncRequests: DeviceConfigSyncRequest[];
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
  registerDevice: (token: string) => Promise<void>;
  queueSettingsSnapshotForSync: (origin: "pos" | "push") => Promise<void>;
  syncPendingOutbox: () => Promise<void>;
  applyConfigSyncRequest: (requestId: string) => Promise<void>;
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
  updateShopSettings: (settings: Pick<Settings, "shopName" | "primaryColor" | "secondaryColor">) => Promise<void>;
  setReportRange: (startDate: string, endDate: string) => void;
};

const today = toDateInputValue(new Date());
const hexColorPattern = /^#[0-9a-f]{6}$/i;
const defaultSettings: Settings = {
  id: "main",
  ...defaultShopSettings,
  settingsUpdatedAt: null,
  settingsChangeOrigin: null,
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
    deviceRegistration,
    syncState,
    syncOutbox,
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
      db.deviceRegistration.get("main"),
      db.syncState.get("main"),
      db.syncOutbox.orderBy("createdAt").reverse().toArray(),
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
    deviceRegistration: { ...defaultDeviceRegistration, ...deviceRegistration },
    syncState: { ...defaultSyncState, ...syncState },
    syncOutbox,
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

function compactDisplayDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}${day}${year}`;
}

async function createTransactionNumber(createdAt: Date, orderType: OrderType, deviceRegistration: DeviceRegistration) {
  const key = compactDisplayDateKey(createdAt);
  const dayStart = new Date(createdAt);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(createdAt);
  dayEnd.setHours(23, 59, 59, 999);

  const count = await db.transactions
    .where("createdAt")
    .between(dayStart.toISOString(), dayEnd.toISOString(), true, true)
    .count();

  const orderPrefix = orderType === "dine-in" ? "DI" : "TO";
  const shopCode = deviceRegistration.shopCode ?? "00";
  const deviceCode = deviceRegistration.deviceCode ?? "00";

  return `${orderPrefix}-${shopCode}${deviceCode}-${key}-${String(count + 1).padStart(4, "0")}`;
}

function requireRegisteredDevice(deviceRegistration: DeviceRegistration) {
  if (
    deviceRegistration.registrationStatus !== "registered" ||
    !deviceRegistration.ownerId ||
    !deviceRegistration.shopId ||
    !deviceRegistration.deviceId
  ) {
    throw new Error("Register this device before using the POS.");
  }
}

function createOutboxEntry(eventType: SyncOutboxEntry["eventType"], recordId: string, payload: unknown): SyncOutboxEntry {
  const now = new Date().toISOString();

  return {
    id: createId("sync"),
    eventType,
    recordId,
    payload,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    lastError: null,
    syncedAt: null,
  };
}

async function queueSettingsSnapshot(origin: "pos" | "push", markChanged = true) {
  const registration = await db.deviceRegistration.get("main");
  if (registration?.registrationStatus !== "registered") {
    return;
  }

  if (markChanged) {
    await db.settings.update("main", {
      settingsUpdatedAt: new Date().toISOString(),
      settingsChangeOrigin: origin,
    });
  }

  const payload = await createSettingsExport(origin);
  await db.syncOutbox.add(createOutboxEntry("settings.snapshot", registration.deviceId ?? "settings", payload));
}

let syncInFlight = false;
let syncQueued = false;

function requestSilentSync(get: () => PosState) {
  if (navigator.onLine) {
    void get().syncPendingOutbox();
  }
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
  deviceRegistration: defaultDeviceRegistration,
  syncState: defaultSyncState,
  syncOutbox: [],
  pendingConfigSyncRequests: [],
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
  registerDevice: async (token) => {
    const currentRegistration = await db.deviceRegistration.get("main");

    if (currentRegistration?.registrationStatus === "registered") {
      throw new Error("This device is already registered.");
    }

    const registration = await consumeRegistrationToken(token);
    const nextRegistration: DeviceRegistration = {
      id: "main",
      registrationStatus: "registered",
      ownerId: registration.ownerId,
      ownerName: registration.ownerName,
      businessName: registration.businessName,
      shopId: registration.shopId,
      shopCode: registration.shopCode,
      deviceId: registration.deviceId,
      deviceCode: registration.deviceCode,
      deviceName: registration.deviceName,
      credentialId: registration.credentialId,
      credentialSecret: registration.credentialSecret,
      registeredAt: registration.registeredAt,
      lastSeenAt: registration.registeredAt,
    };

    await db.deviceRegistration.put(nextRegistration);
    set({ ...(await loadSnapshot()) });
  },
  queueSettingsSnapshotForSync: async (origin) => {
    await queueSettingsSnapshot(origin, false);
    set(await loadSnapshot());
  },
  syncPendingOutbox: async () => {
    if (syncInFlight) {
      syncQueued = true;
      return;
    }

    async function syncOnce() {
      const registration = await db.deviceRegistration.get("main");

      if (
        registration?.registrationStatus !== "registered" ||
        !registration.deviceId ||
        !registration.credentialId ||
        !registration.credentialSecret
      ) {
        return;
      }

      if (!navigator.onLine) {
        await db.syncState.put({ ...defaultSyncState, status: "offline" });
        set(await loadSnapshot());
        return;
      }

      const pendingEntries = await db.syncOutbox.where("status").equals("pending").toArray();
      if (pendingEntries.length === 0) {
        try {
          const acknowledgement = await uploadSyncOutbox(registration, []);
          await db.deviceRegistration.update("main", { lastSeenAt: new Date().toISOString() });
          set({ ...(await loadSnapshot()), pendingConfigSyncRequests: acknowledgement.configRequests ?? get().pendingConfigSyncRequests });
        } catch {
          await db.syncState.put({
            id: "main",
            status: "idle",
            lastSuccessfulSyncAt: get().syncState.lastSuccessfulSyncAt,
            lastFailedSyncAt: null,
            lastError: null,
          });
          set(await loadSnapshot());
        }
        return;
      }

      await db.syncState.put({
        ...get().syncState,
        id: "main",
        status: "syncing",
        lastError: null,
      });
      set(await loadSnapshot());

      let configRequests = get().pendingConfigSyncRequests;
      try {
        const acknowledgement = await uploadSyncOutbox(registration, pendingEntries);
        const acknowledgedIds = new Set(acknowledgement.acknowledgedIds);
        configRequests = acknowledgement.configRequests ?? configRequests;
        const syncedAt = new Date().toISOString();

        await db.transaction("rw", db.syncOutbox, db.syncState, db.deviceRegistration, async () => {
        await Promise.all(
          pendingEntries.filter((entry) => acknowledgedIds.has(entry.id)).map((entry) =>
            db.syncOutbox.update(entry.id, {
              status: "synced",
              attempts: entry.attempts + 1,
              updatedAt: syncedAt,
              syncedAt,
              lastError: null,
            }),
          ),
        );
        await db.syncState.put({
          id: "main",
          status: "idle",
          lastSuccessfulSyncAt: syncedAt,
          lastFailedSyncAt: null,
          lastError: null,
        });
        await db.deviceRegistration.update("main", { lastSeenAt: syncedAt });
        });
      } catch (syncError) {
        const failedAt = new Date().toISOString();
        await db.transaction("rw", db.syncOutbox, db.syncState, async () => {
          await Promise.all(
            pendingEntries.map((entry) =>
              db.syncOutbox.update(entry.id, {
                attempts: entry.attempts + 1,
                updatedAt: failedAt,
                lastError: syncError instanceof Error ? syncError.message : "Sync failed.",
              }),
            ),
          );
          await db.syncState.put({
            id: "main",
            status: "error",
            lastSuccessfulSyncAt: get().syncState.lastSuccessfulSyncAt,
            lastFailedSyncAt: failedAt,
            lastError: syncError instanceof Error ? syncError.message : "Sync failed.",
          });
        });
      }
      set({ ...(await loadSnapshot()), pendingConfigSyncRequests: configRequests });
    }

    syncInFlight = true;
    try {
      do {
        syncQueued = false;
        await syncOnce();
      } while (syncQueued);
    } finally {
      syncInFlight = false;
    }
  },
  applyConfigSyncRequest: async (requestId) => {
    const request = get().pendingConfigSyncRequests.find((entry) => entry.id === requestId);
    const registration = await db.deviceRegistration.get("main");
    if (!request || !registration) return;

    try {
      await updateConfigSyncRequestStatus(registration, request.id, "accepted");
      await importSettingsExport(request.settingsPayload);
      await queueSettingsSnapshot("push");
      await updateConfigSyncRequestStatus(registration, request.id, "applied");
      set({
        ...(await loadSnapshot()),
        cart: [],
        cartDiscount: null,
        pendingConfigSyncRequests: get().pendingConfigSyncRequests.filter((entry) => entry.id !== requestId),
      });
    } catch (error) {
      await updateConfigSyncRequestStatus(
        registration,
        request.id,
        "failed",
        error instanceof Error ? error.message : "Could not apply settings.",
      );
      throw error;
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
    requireRegisteredDevice(state.deviceRegistration);
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
      transactionNumber: await createTransactionNumber(now, orderType, state.deviceRegistration),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ownerId: state.deviceRegistration.ownerId,
      shopId: state.deviceRegistration.shopId,
      deviceId: state.deviceRegistration.deviceId,
      shopCodeSnapshot: state.deviceRegistration.shopCode,
      deviceCodeSnapshot: state.deviceRegistration.deviceCode,
      userId: state.deviceRegistration.ownerId,
      userNameSnapshot: state.deviceRegistration.ownerName,
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

      const categoryName =
        item.categoryId === null
          ? "Uncategorized"
          : state.categories.find((category) => category.id === item.categoryId)?.name ?? "Uncategorized";
      const effectivePrice = line.variantPrice ?? item.price;
      const addOnsTotal = line.selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);

      return {
        id: createId("txni"),
        transactionId,
        itemId: item.id,
        itemNameSnapshot: item.name,
        itemPriceSnapshot: item.price,
        categoryIdSnapshot: item.categoryId,
        categoryNameSnapshot: categoryName,
        variantId: line.variantId,
        variantNameSnapshot: line.variantName,
        variantPriceSnapshot: line.variantPrice,
        selectedModifiers: line.selectedModifiers,
        selectedAddOns: line.selectedAddOns,
        quantity: line.quantity,
        lineTotal: (effectivePrice + addOnsTotal) * line.quantity,
      };
    });

    await db.transaction("rw", db.transactions, db.transactionItems, db.syncOutbox, async () => {
      await db.transactions.add(transaction);
      await db.transactionItems.bulkAdd(transactionItems);
      await db.syncOutbox.add(createOutboxEntry("transaction.created", transaction.id, { transaction, transactionItems }));
    });

    const snapshot = await loadSnapshot();
    set({ ...snapshot, cart: [], cartDiscount: null });
    requestSilentSync(get);

    return transaction;
  },
  markTransactionServed: async (transactionId) => {
    const transaction = await db.transactions.get(transactionId);

    if (!transaction || transaction.isVoided) {
      return;
    }

    const updatedAt = new Date().toISOString();
    await db.transaction("rw", db.transactions, db.syncOutbox, async () => {
      await db.transactions.update(transactionId, { isServed: true, updatedAt });
      await db.syncOutbox.add(createOutboxEntry("transaction.served", transactionId, { transactionId, updatedAt }));
    });
    set(await loadSnapshot());
    requestSilentSync(get);
  },
  voidTransaction: async (transactionId, reason) => {
    const transaction = await db.transactions.get(transactionId);
    const trimmedReason = reason.trim();

    if (!transaction || transaction.isVoided || trimmedReason.length === 0) {
      return;
    }

    const updatedAt = new Date().toISOString();
    await db.transaction("rw", db.transactions, db.syncOutbox, async () => {
      await db.transactions.update(transactionId, {
        isVoided: true,
        voidReason: trimmedReason,
        voidedAt: updatedAt,
        updatedAt,
      });
      await db.syncOutbox.add(
        createOutboxEntry("transaction.voided", transactionId, { transactionId, reason: trimmedReason, updatedAt }),
      );
    });
    set(await loadSnapshot());
    requestSilentSync(get);
  },
  saveCategory: async ({ id, name, defaultColor }) => {
    const category: Category = {
      id: id ?? createId("cat"),
      name: name.trim(),
      defaultColor,
      createdAt: new Date().toISOString(),
    };

    await db.categories.put(category);
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  deleteCategory: async (categoryId) => {
    await db.transaction("rw", db.categories, db.items, async () => {
      await db.categories.delete(categoryId);
      const assignedItems = await db.items.where("categoryId").equals(categoryId).toArray();
      await Promise.all(
        assignedItems.map((item) => db.items.update(item.id, { categoryId: null })),
      );
    });
    await queueSettingsSnapshot("pos");
    set({ ...(await loadSnapshot()), selectedCategoryId: "all" });
    if (navigator.onLine) void get().syncPendingOutbox();
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
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
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
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  deleteItem: async (itemId) => {
    await db.items.delete(itemId);
    await db.itemVariants.where("itemId").equals(itemId).delete();
    await db.itemModifiers.where("itemId").equals(itemId).delete();
    await db.itemAddOns.where("itemId").equals(itemId).delete();
    await db.itemAddOns.where("addOnItemId").equals(itemId).delete();
    await queueSettingsSnapshot("pos");
    set({
      ...(await loadSnapshot()),
      cart: get().cart.filter((line) => line.itemId !== itemId),
    });
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  toggleItemOutOfStock: async (itemId) => {
    const item = await db.items.get(itemId);

    if (!item) {
      return;
    }

    await db.items.update(itemId, { isOutOfStock: !item.isOutOfStock });
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
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
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  deleteItemVariant: async (variantId) => {
    await db.itemVariants.delete(variantId);
    await queueSettingsSnapshot("pos");
    set({
      ...(await loadSnapshot()),
      cart: get().cart.filter((line) => line.variantId !== variantId),
    });
    if (navigator.onLine) void get().syncPendingOutbox();
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
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  deleteModifier: async (modifierId) => {
    await db.itemModifiers.where("modifierId").equals(modifierId).delete();
    await db.modifiers.delete(modifierId);
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
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
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  unlinkModifierFromItem: async (itemId, modifierId) => {
    await db.itemModifiers
      .where("itemId")
      .equals(itemId)
      .filter((itemModifier) => itemModifier.modifierId === modifierId)
      .delete();
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
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
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  unlinkAddOnFromItem: async (itemId, addOnItemId) => {
    await db.itemAddOns
      .where("itemId")
      .equals(itemId)
      .filter((itemAddOn) => itemAddOn.addOnItemId === addOnItemId)
      .delete();
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  saveAdjustment: async ({ id, label, type, value, enabled }) => {
    const adjustment: Adjustment = {
      id: id ?? createId("adj"),
      label: label.trim(),
      type,
      value: Math.max(0, value),
      enabled,
      createdAt: new Date().toISOString(),
    };

    await db.adjustments.put(adjustment);
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  deleteAdjustment: async (adjustmentId) => {
    await db.adjustments.delete(adjustmentId);
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
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
    await queueSettingsSnapshot("pos");
    set(await loadSnapshot());
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  deleteDiscountTemplate: async (discountId) => {
    await db.discountTemplates.delete(discountId);
    await queueSettingsSnapshot("pos");
    const cartDiscount = get().cartDiscount;
    set({
      ...(await loadSnapshot()),
      cartDiscount: cartDiscount?.discountId === discountId ? null : cartDiscount,
    });
    if (navigator.onLine) void get().syncPendingOutbox();
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
    await queueSettingsSnapshot("pos");
    set({ settings: nextSettings });
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  setDiscountsEnabled: async (enabled) => {
    const settings = get().settings;
    const nextSettings: Settings = {
      ...settings,
      discountEnabled: enabled,
    };

    await db.settings.put(nextSettings);
    await queueSettingsSnapshot("pos");
    set({ settings: nextSettings, cartDiscount: enabled ? get().cartDiscount : null });
    if (navigator.onLine) void get().syncPendingOutbox();
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
    await queueSettingsSnapshot("pos");
    set({ settings: nextSettings });
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  updateShopSettings: async (shopSettings) => {
    const settings = get().settings;
    const trimmedShopName = shopSettings.shopName.trim();
    const nextSettings: Settings = {
      ...settings,
      shopName: trimmedShopName.length > 0 ? trimmedShopName : defaultShopSettings.shopName,
      primaryColor: hexColorPattern.test(shopSettings.primaryColor) ? shopSettings.primaryColor : settings.primaryColor,
      secondaryColor: hexColorPattern.test(shopSettings.secondaryColor) ? shopSettings.secondaryColor : settings.secondaryColor,
    };

    await db.settings.put(nextSettings);
    await queueSettingsSnapshot("pos");
    set({ settings: nextSettings });
    if (navigator.onLine) void get().syncPendingOutbox();
  },
  setReportRange: (reportStartDate, reportEndDate) => {
    set({ reportStartDate, reportEndDate });
  },
}));
