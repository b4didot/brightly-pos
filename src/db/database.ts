import Dexie, { type Table } from "dexie";
import { seedCategories, seedItems } from "../constants/catalog";
import type { Adjustment, Category, Item, Settings, Transaction, TransactionItem } from "../types";
import { defaultVatSettings } from "../utils/vat";

class BrightlyDatabase extends Dexie {
  categories!: Table<Category, string>;
  items!: Table<Item, string>;
  adjustments!: Table<Adjustment, string>;
  settings!: Table<Settings, string>;
  transactions!: Table<Transaction, string>;
  transactionItems!: Table<TransactionItem, string>;

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
      });
    } else {
      await db.settings.put({
        ...settings,
        vatEnabled: settings.vatEnabled ?? defaultVatSettings.vatEnabled,
        vatPercentage: settings.vatPercentage ?? defaultVatSettings.vatPercentage,
        vatInclusive: settings.vatInclusive ?? defaultVatSettings.vatInclusive,
      });
    }

  const categoryCount = await db.categories.count();
  const itemCount = await db.items.count();

  if (categoryCount === 0) {
    await db.categories.bulkPut(seedCategories);
  }

  if (itemCount === 0) {
    await db.items.bulkPut(seedItems);
  }
}

export async function resetDatabase() {
  await db.delete();
  await ensureDatabaseSeeded();
}
