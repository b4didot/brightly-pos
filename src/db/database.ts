import Dexie, { type Table } from "dexie";
import { seedCategories, seedItems } from "../constants/catalog";
import type {
  Adjustment,
  Category,
  DiscountTemplate,
  Item,
  ItemModifier,
  ItemAddOn,
  ItemVariant,
  Modifier,
  Settings,
  Transaction,
  TransactionItem,
} from "../types";
import { defaultVatSettings } from "../utils/vat";

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
  }
}

export const db = new BrightlyDatabase();

export async function ensureDatabaseSeeded() {
  const settings = await db.settings.get("main");

  if (!settings) {
    await db.settings.put({
      id: "main",
      cashEnabled: true,
      cardEnabled: true,
      ...defaultVatSettings,
      discountEnabled: true,
    });
  } else {
    await db.settings.put({
      ...settings,
      vatEnabled: settings.vatEnabled ?? defaultVatSettings.vatEnabled,
      vatPercentage: settings.vatPercentage ?? defaultVatSettings.vatPercentage,
      vatInclusive: true,
      discountEnabled: settings.discountEnabled ?? true,
    });
  }

  const categoryCount = await db.categories.count();
  const itemCount = await db.items.count();

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
}

export async function resetDatabase() {
  await db.delete();
  await db.open();
  await ensureDatabaseSeeded();
}
