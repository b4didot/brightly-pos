import Dexie, { type Table } from "dexie";
import {
  seedCategories,
  seedItemAddOns,
  seedItemModifiers,
  seedItems,
  seedItemVariants,
  seedModifiers,
} from "../constants/catalog";
import type {
  Adjustment,
  Category,
  DiscountTemplate,
  Item,
  ItemModifier,
  ItemAddOn,
  ItemVariant,
  Modifier,
  DeviceRegistration,
  Settings,
  SyncOutboxEntry,
  SyncState,
  Transaction,
  TransactionItem,
} from "../types";
import { defaultVatSettings } from "../utils/vat";

const defaultShopSettings = {
  shopName: "Coffee Bar",
  primaryColor: "#d97706",
  secondaryColor: "#fffaf3",
};

class BrightlyDatabase extends Dexie {
  categories!: Table<Category, string>;
  items!: Table<Item, string>;
  adjustments!: Table<Adjustment, string>;
  discountTemplates!: Table<DiscountTemplate, string>;
  settings!: Table<Settings, string>;
  transactions!: Table<Transaction, string>;
  transactionItems!: Table<TransactionItem, string>;
  itemVariants!: Table<ItemVariant, string>;
  modifiers!: Table<Modifier, string>;
  itemModifiers!: Table<ItemModifier, string>;
  itemAddOns!: Table<ItemAddOn, string>;
  deviceRegistration!: Table<DeviceRegistration, string>;
  syncOutbox!: Table<SyncOutboxEntry, string>;
  syncState!: Table<SyncState, string>;

  constructor() {
    super("brightly-pos-v0");

    this.version(1).stores({
      categories: "&id, name",
      items: "&id, categoryId, name",
      adjustments: "&id, enabled",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
    });

    this.version(2).stores({
      categories: "&id, name",
      items: "&id, categoryId, name",
      adjustments: "&id, label, enabled",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
    });

    this.version(3).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock",
      adjustments: "&id, label, enabled",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
    }).upgrade(async (transaction) => {
      await transaction.table<Item, string>("items").toCollection().modify((item) => {
        item.isOutOfStock = item.isOutOfStock ?? false;
      });
    });

    this.version(4).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock",
      adjustments: "&id, label, enabled",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
    }).upgrade(async (transaction) => {
      await transaction.table<Transaction, string>("transactions").toCollection().modify((txn) => {
        if (!txn.orderType) {
          txn.orderType = "dine-in";
        }
      });
    });

    this.version(5).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock",
      adjustments: "&id, label, enabled",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
    }).upgrade(async (transaction) => {
      await transaction.table<Transaction, string>("transactions").toCollection().modify((txn) => {
        if (txn.isServed === undefined) {
          txn.isServed = false;
        }
      });
    });

    this.version(6).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock",
      adjustments: "&id, label, enabled",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
      itemVariants: "&id, itemId",
      modifiers: "&id",
      itemModifiers: "&id, itemId, modifierId",
    }).upgrade(async (transaction) => {
      await transaction.table<TransactionItem, string>("transactionItems").toCollection().modify((item) => {
        if (item.variantId === undefined) item.variantId = null;
        if (item.variantNameSnapshot === undefined) item.variantNameSnapshot = null;
        if (item.variantPriceSnapshot === undefined) item.variantPriceSnapshot = null;
        if (!item.selectedModifiers) item.selectedModifiers = [];
      });
    });

    this.version(7).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock",
      adjustments: "&id, label, enabled",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
      itemVariants: "&id, itemId, sortOrder",
      modifiers: "&id",
      itemModifiers: "&id, itemId, modifierId",
    });

    this.version(8).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock",
      adjustments: "&id, label, enabled",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
      itemVariants: "&id, itemId, sortOrder",
      modifiers: "&id, label",
      itemModifiers: "&id, itemId, modifierId",
    });

    this.version(9).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock",
      adjustments: "&id, label, enabled",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
      itemVariants: "&id, itemId, sortOrder",
      modifiers: "&id, label",
      itemModifiers: "&id, itemId, modifierId",
      itemAddOns: "&id, itemId, addOnItemId",
    }).upgrade(async (transaction) => {
      await transaction.table<TransactionItem, string>("transactionItems").toCollection().modify((item) => {
        if (!item.selectedAddOns) item.selectedAddOns = [];
      });
    });

    this.version(10).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock, isAddOn",
      adjustments: "&id, label, enabled",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
      itemVariants: "&id, itemId, sortOrder",
      modifiers: "&id, label",
      itemModifiers: "&id, itemId, modifierId",
      itemAddOns: "&id, itemId, addOnItemId",
    }).upgrade(async (transaction) => {
      await transaction.table<Item, string>("items").toCollection().modify((item) => {
        if (item.isAddOn === undefined) item.isAddOn = false;
      });
    });

    this.version(11).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock, isAddOn",
      adjustments: "&id, label, enabled",
      discountTemplates: "&id, label",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
      itemVariants: "&id, itemId, sortOrder",
      modifiers: "&id, label",
      itemModifiers: "&id, itemId, modifierId",
      itemAddOns: "&id, itemId, addOnItemId",
    }).upgrade(async (transaction) => {
      await transaction.table<Settings, string>("settings").toCollection().modify((settings) => {
        settings.discountEnabled = settings.discountEnabled ?? true;
      });
      await transaction.table<Transaction, string>("transactions").toCollection().modify((txn) => {
        if (txn.discount === undefined) txn.discount = null;
      });
    });

    this.version(12).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock, isAddOn",
      adjustments: "&id, label, enabled",
      discountTemplates: "&id, label",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
      itemVariants: "&id, itemId, sortOrder",
      modifiers: "&id, label",
      itemModifiers: "&id, itemId, modifierId",
      itemAddOns: "&id, itemId, addOnItemId",
    }).upgrade(async (transaction) => {
      await transaction.table<Transaction, string>("transactions").toCollection().modify((txn) => {
        txn.isVoided = txn.isVoided ?? false;
        txn.voidReason = txn.voidReason ?? null;
        txn.voidedAt = txn.voidedAt ?? null;
      });
    });

    this.version(13).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock, isAddOn",
      adjustments: "&id, label, enabled",
      discountTemplates: "&id, label",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod",
      transactionItems: "&id, transactionId, itemId",
      itemVariants: "&id, itemId, sortOrder",
      modifiers: "&id, label",
      itemModifiers: "&id, itemId, modifierId",
      itemAddOns: "&id, itemId, addOnItemId",
    }).upgrade(async (transaction) => {
      await transaction.table<Settings, string>("settings").toCollection().modify((settings) => {
        settings.shopName = settings.shopName ?? defaultShopSettings.shopName;
        settings.primaryColor = settings.primaryColor ?? defaultShopSettings.primaryColor;
        settings.secondaryColor = settings.secondaryColor ?? defaultShopSettings.secondaryColor;
      });
    });

    this.version(14).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock, isAddOn",
      adjustments: "&id, label, enabled",
      discountTemplates: "&id, label",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod, ownerId, shopId, deviceId",
      transactionItems: "&id, transactionId, itemId",
      itemVariants: "&id, itemId, sortOrder",
      modifiers: "&id, label",
      itemModifiers: "&id, itemId, modifierId",
      itemAddOns: "&id, itemId, addOnItemId",
      deviceRegistration: "&id, registrationStatus, ownerId, shopId, deviceId",
      syncOutbox: "&id, eventType, recordId, status, createdAt",
      syncState: "&id",
    }).upgrade(async (transaction) => {
      await transaction.table<Transaction, string>("transactions").toCollection().modify((txn) => {
        txn.updatedAt = txn.updatedAt ?? txn.createdAt;
        txn.ownerId = txn.ownerId ?? null;
        txn.shopId = txn.shopId ?? null;
        txn.deviceId = txn.deviceId ?? null;
        txn.shopCodeSnapshot = txn.shopCodeSnapshot ?? null;
        txn.deviceCodeSnapshot = txn.deviceCodeSnapshot ?? null;
        txn.userId = txn.userId ?? null;
        txn.userNameSnapshot = txn.userNameSnapshot ?? null;
      });
    });

    this.version(15).stores({
      categories: "&id, name",
      items: "&id, categoryId, name, isOutOfStock, isAddOn",
      adjustments: "&id, label, enabled",
      discountTemplates: "&id, label",
      settings: "&id",
      transactions: "&id, transactionNumber, createdAt, paymentMethod, ownerId, shopId, deviceId",
      transactionItems: "&id, transactionId, itemId",
      itemVariants: "&id, itemId, sortOrder",
      modifiers: "&id, label",
      itemModifiers: "&id, itemId, modifierId",
      itemAddOns: "&id, itemId, addOnItemId",
      deviceRegistration: "&id, registrationStatus, ownerId, shopId, deviceId",
      syncOutbox: "&id, eventType, recordId, status, createdAt",
      syncState: "&id",
    }).upgrade(async (transaction) => {
      const categories = await transaction.table<Category, string>("categories").toArray();
      const categoryNamesById = new Map(categories.map((category) => [category.id, category.name]));
      const items = await transaction.table<Item, string>("items").toArray();
      const itemCategoriesById = new Map(
        items.map((item) => [
          item.id,
          {
            categoryIdSnapshot: item.categoryId,
            categoryNameSnapshot:
              item.categoryId === null
                ? "Uncategorized"
                : categoryNamesById.get(item.categoryId) ?? "Uncategorized",
          },
        ]),
      );

      await transaction.table<TransactionItem, string>("transactionItems").toCollection().modify((item) => {
        const categorySnapshot = itemCategoriesById.get(item.itemId);
        item.categoryIdSnapshot = item.categoryIdSnapshot ?? categorySnapshot?.categoryIdSnapshot ?? null;
        item.categoryNameSnapshot = item.categoryNameSnapshot ?? categorySnapshot?.categoryNameSnapshot ?? "Uncategorized";
      });
    });
  }
}

export const db = new BrightlyDatabase();
export { defaultShopSettings };

export const defaultDeviceRegistration: DeviceRegistration = {
  id: "main",
  registrationStatus: "unregistered",
  ownerId: null,
  ownerName: null,
  businessName: null,
  shopId: null,
  shopCode: null,
  deviceId: null,
  deviceCode: null,
  deviceName: null,
  credentialId: null,
  credentialSecret: null,
  registeredAt: null,
  lastSeenAt: null,
};

export const defaultSyncState: SyncState = {
  id: "main",
  status: "idle",
  lastSuccessfulSyncAt: null,
  lastFailedSyncAt: null,
  lastError: null,
};

export async function ensureDatabaseSeeded() {
  const settings = await db.settings.get("main");
  const deviceRegistration = await db.deviceRegistration.get("main");
  const syncState = await db.syncState.get("main");

  if (!settings) {
    await db.settings.put({
      id: "main",
      ...defaultShopSettings,
      cashEnabled: true,
      cardEnabled: true,
      ...defaultVatSettings,
      discountEnabled: true,
    });
  } else {
    await db.settings.put({
      ...settings,
      shopName: settings.shopName ?? defaultShopSettings.shopName,
      primaryColor: settings.primaryColor ?? defaultShopSettings.primaryColor,
      secondaryColor: settings.secondaryColor ?? defaultShopSettings.secondaryColor,
      vatEnabled: settings.vatEnabled ?? defaultVatSettings.vatEnabled,
      vatPercentage: settings.vatPercentage ?? defaultVatSettings.vatPercentage,
      vatInclusive: true,
      discountEnabled: settings.discountEnabled ?? true,
    });
  }

  if (!deviceRegistration) {
    await db.deviceRegistration.put(defaultDeviceRegistration);
  }

  if (!syncState) {
    await db.syncState.put(defaultSyncState);
  }

  const categoryCount = await db.categories.count();
  const itemCount = await db.items.count();
  const itemVariantCount = await db.itemVariants.count();
  const modifierCount = await db.modifiers.count();
  const itemModifierCount = await db.itemModifiers.count();
  const itemAddOnCount = await db.itemAddOns.count();

  if (categoryCount === 0) {
    await db.categories.bulkPut(seedCategories);
  }

  if (itemCount === 0) {
    await db.items.bulkPut(seedItems);
  } else {
    const itemsMissingStockFlag = await db.items
      .filter((item) => item.isOutOfStock === undefined)
      .toArray();

    if (itemsMissingStockFlag.length > 0) {
      await Promise.all(
        itemsMissingStockFlag.map((item) => db.items.update(item.id, { isOutOfStock: false })),
      );
    }

    const itemsMissingAddOnFlag = await db.items
      .filter((item) => item.isAddOn === undefined)
      .toArray();

    if (itemsMissingAddOnFlag.length > 0) {
      await Promise.all(
        itemsMissingAddOnFlag.map((item) => db.items.update(item.id, { isAddOn: false })),
      );
    }
  }

  if (itemVariantCount === 0) {
    await db.itemVariants.bulkPut(seedItemVariants);
  }

  if (modifierCount === 0) {
    await db.modifiers.bulkPut(seedModifiers);
  }

  if (itemModifierCount === 0) {
    await db.itemModifiers.bulkPut(seedItemModifiers);
  }

  if (itemAddOnCount === 0) {
    await db.itemAddOns.bulkPut(seedItemAddOns);
  }
}

export async function resetDatabase() {
  await db.delete();
  await db.open();
  await ensureDatabaseSeeded();
}
