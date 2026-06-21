import { db } from "../db/database";
import type {
  Adjustment,
  AppliedAdjustment,
  AppliedDiscount,
  Category,
  DeviceRegistration,
  DiscountTemplate,
  Item,
  ItemAddOn,
  ItemModifier,
  ItemVariant,
  Modifier,
  OrderType,
  PaymentMethod,
  SelectedAddOn,
  SelectedModifier,
  Settings,
  SyncOutboxEntry,
  Transaction,
  TransactionItem,
} from "../types";
import { createId } from "./id";
import { calculateInclusiveVat } from "./vat";

const seedStartDate = new Date(2026, 4, 1, 8, 15, 0, 0);

type SeedLine = {
  item: Item;
  transactionItem: TransactionItem;
};

export type SeedOrdersResult = {
  insertedTransactions: number;
  insertedTransactionItems: number;
  insertedOutboxEntries: number;
  skippedExistingTransactions: number;
  startDate: string;
  endDate: string;
  minTotal: number | null;
  maxTotal: number | null;
};

function compactDisplayDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}${day}${year}`;
}

function isoDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function choose<T>(entries: T[], index: number) {
  return entries[index % entries.length];
}

function createOutboxEntry(
  eventType: SyncOutboxEntry["eventType"],
  recordId: string,
  payload: unknown,
  createdAt: string,
): SyncOutboxEntry {
  return {
    id: createId("sync"),
    eventType,
    recordId,
    payload,
    status: "pending",
    attempts: 0,
    createdAt,
    updatedAt: createdAt,
    lastError: null,
    syncedAt: null,
  };
}

function createSeedLine({
  addOnsByItemId,
  categoriesById,
  dayIndex,
  item,
  lineIndex,
  modifiersByItemId,
  variantsByItemId,
}: {
  addOnsByItemId: Map<string, Item[]>;
  categoriesById: Map<string, Category>;
  dayIndex: number;
  item: Item;
  lineIndex: number;
  modifiersByItemId: Map<string, Modifier[]>;
  variantsByItemId: Map<string, ItemVariant[]>;
}): SeedLine {
  const variants = variantsByItemId.get(item.id) ?? [];
  const variant = variants.length > 0 ? choose(variants, dayIndex + lineIndex) : null;
  const selectedModifiers: SelectedModifier[] = (modifiersByItemId.get(item.id) ?? []).map((modifier, modifierIndex) => ({
    modifierId: modifier.id,
    label: modifier.label,
    selectedOption: choose(modifier.options, dayIndex + lineIndex + modifierIndex),
  }));
  const linkedAddOns = addOnsByItemId.get(item.id) ?? [];
  const addOnCount = linkedAddOns.length === 0 ? 0 : (dayIndex + lineIndex) % Math.min(3, linkedAddOns.length + 1);
  const selectedAddOns: SelectedAddOn[] = Array.from({ length: addOnCount }, (_, offset) => {
    const addOn = choose(linkedAddOns, dayIndex + lineIndex + offset);

    return {
      itemId: addOn.id,
      name: addOn.name,
      price: addOn.price,
    };
  });
  const quantity = 1 + ((dayIndex + lineIndex) % 3 === 0 ? 1 : 0);
  const effectivePrice = variant?.price ?? item.price;
  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  const categoryName =
    item.categoryId === null ? "Uncategorized" : categoriesById.get(item.categoryId)?.name ?? "Uncategorized";

  return {
    item,
    transactionItem: {
      id: createId("txni"),
      transactionId: "",
      itemId: item.id,
      itemNameSnapshot: item.name,
      itemPriceSnapshot: item.price,
      categoryIdSnapshot: item.categoryId,
      categoryNameSnapshot: categoryName,
      variantId: variant?.id ?? null,
      variantNameSnapshot: variant?.name ?? null,
      variantPriceSnapshot: variant?.price ?? null,
      selectedModifiers,
      selectedAddOns,
      quantity,
      lineTotal: (effectivePrice + addOnsTotal) * quantity,
    },
  };
}

function calculateSeedTotals({
  adjustments,
  discountTemplate,
  lines,
  settings,
}: {
  adjustments: Adjustment[];
  discountTemplate: DiscountTemplate | null;
  lines: SeedLine[];
  settings: Settings;
}) {
  const subtotal = lines.reduce((sum, line) => sum + line.transactionItem.lineTotal, 0);
  const discount: AppliedDiscount | null = discountTemplate
    ? {
        discountId: discountTemplate.id,
        label: discountTemplate.label,
        type: discountTemplate.type,
        value: discountTemplate.value,
        computedAmount: Math.min(
          subtotal,
          discountTemplate.type === "percentage"
            ? Math.round(subtotal * (Math.max(0, discountTemplate.value) / 100))
            : Math.round(Math.max(0, discountTemplate.value)),
        ),
      }
    : null;
  const subtotalAfterDiscount = Math.max(0, subtotal - (discount?.computedAmount ?? 0));
  const appliedAdjustments: AppliedAdjustment[] = adjustments
    .filter((adjustment) => adjustment.enabled && adjustment.value > 0)
    .map((adjustment) => ({
      adjustmentId: adjustment.id,
      label: adjustment.label,
      type: adjustment.type,
      value: adjustment.value,
      computedAmount:
        adjustment.type === "percentage"
          ? Math.round(subtotalAfterDiscount * (adjustment.value / 100))
          : Math.round(Math.max(0, adjustment.value)),
    }));
  const adjustmentTotal = appliedAdjustments.reduce((sum, adjustment) => sum + adjustment.computedAmount, 0);
  const totalAmount = Math.max(0, subtotalAfterDiscount + adjustmentTotal);

  return {
    subtotal,
    discount,
    adjustments: appliedAdjustments,
    totalAmount,
    ...calculateInclusiveVat(totalAmount, settings),
  };
}

function requireRegisteredDevice(registration: DeviceRegistration) {
  if (
    registration.registrationStatus !== "registered" ||
    !registration.ownerId ||
    !registration.shopId ||
    !registration.deviceId
  ) {
    throw new Error("Register this device before seeding orders.");
  }
}

export async function seedDemoOrdersThroughToday(): Promise<SeedOrdersResult> {
  const [
    categories,
    items,
    itemVariants,
    modifiers,
    itemModifiers,
    itemAddOns,
    adjustments,
    discountTemplates,
    settings,
    registration,
    existingTransactions,
  ] = await Promise.all([
    db.categories.toArray(),
    db.items.toArray(),
    db.itemVariants.toArray(),
    db.modifiers.toArray(),
    db.itemModifiers.toArray(),
    db.itemAddOns.toArray(),
    db.adjustments.toArray(),
    db.discountTemplates.toArray(),
    db.settings.get("main"),
    db.deviceRegistration.get("main"),
    db.transactions.toArray(),
  ]);

  if (!settings) throw new Error("Settings are not available.");
  if (!registration) throw new Error("Device registration is not available.");
  requireRegisteredDevice(registration);

  const regularItems = items.filter((item) => !item.isAddOn && !item.isOutOfStock);
  if (regularItems.length === 0) throw new Error("No available menu items found.");

  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const variantsByItemId = new Map<string, ItemVariant[]>();
  itemVariants.forEach((variant) => {
    variantsByItemId.set(variant.itemId, [...(variantsByItemId.get(variant.itemId) ?? []), variant]);
  });

  const modifiersById = new Map(modifiers.map((modifier) => [modifier.id, modifier]));
  const modifiersByItemId = new Map<string, Modifier[]>();
  itemModifiers.forEach((link: ItemModifier) => {
    const modifier = modifiersById.get(link.modifierId);
    if (modifier) modifiersByItemId.set(link.itemId, [...(modifiersByItemId.get(link.itemId) ?? []), modifier]);
  });

  const addOnsByItemId = new Map<string, Item[]>();
  itemAddOns.forEach((link: ItemAddOn) => {
    const addOn = itemsById.get(link.addOnItemId);
    if (addOn && !addOn.isOutOfStock) {
      addOnsByItemId.set(link.itemId, [...(addOnsByItemId.get(link.itemId) ?? []), addOn]);
    }
  });

  const existingSeedIds = new Set(
    existingTransactions.filter((transaction) => transaction.id.startsWith("txn_seed_")).map((transaction) => transaction.id),
  );
  const transactions: Transaction[] = [];
  const transactionItems: TransactionItem[] = [];
  const outboxEntries: SyncOutboxEntry[] = [];
  const today = new Date();
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  let dayIndex = 0;
  let skippedExistingTransactions = 0;

  for (const day = new Date(seedStartDate); day <= endDate; day.setDate(day.getDate() + 1), dayIndex += 1) {
    const ordersForDay = 2 + (dayIndex % 3);
    let sequence = existingTransactions.filter((transaction) => {
      const createdAt = new Date(transaction.createdAt);
      return (
        createdAt.getFullYear() === day.getFullYear() &&
        createdAt.getMonth() === day.getMonth() &&
        createdAt.getDate() === day.getDate()
      );
    }).length;

    for (let orderIndex = 0; orderIndex < ordersForDay; orderIndex += 1) {
      const transactionId = `txn_seed_${day.getFullYear()}${String(day.getMonth() + 1).padStart(2, "0")}${String(day.getDate()).padStart(2, "0")}_${String(orderIndex + 1).padStart(2, "0")}`;

      if (existingSeedIds.has(transactionId)) {
        skippedExistingTransactions += 1;
        continue;
      }

      const createdAt = new Date(day);
      createdAt.setHours(8 + ((dayIndex + orderIndex * 3) % 12), 10 + ((dayIndex * 7 + orderIndex * 11) % 45), 0, 0);
      const lineCount = 1 + ((dayIndex + orderIndex) % 3);
      const lines = Array.from({ length: lineCount }, (_, lineIndex) =>
        createSeedLine({
          addOnsByItemId,
          categoriesById,
          dayIndex: dayIndex + orderIndex,
          item: choose(regularItems, dayIndex * 5 + orderIndex * 3 + lineIndex * 7),
          lineIndex,
          modifiersByItemId,
          variantsByItemId,
        }),
      );
      const discountTemplate =
        discountTemplates.length > 0 && (dayIndex + orderIndex) % 5 === 0
          ? choose(discountTemplates, dayIndex + orderIndex)
          : null;
      const totals = calculateSeedTotals({ adjustments, discountTemplate, lines, settings });
      const orderType: OrderType = (dayIndex + orderIndex) % 2 === 0 ? "dine-in" : "take-out";
      const paymentMethod: PaymentMethod = (dayIndex + orderIndex) % 4 === 0 ? "card" : "cash";
      const cashPaymentAmount = Math.ceil(totals.totalAmount / 5000) * 5000;

      sequence += 1;

      const transaction: Transaction = {
        id: transactionId,
        transactionNumber: `${orderType === "dine-in" ? "DI" : "TO"}-${registration.shopCode ?? "00"}${registration.deviceCode ?? "00"}-${compactDisplayDateKey(createdAt)}-${String(sequence).padStart(4, "0")}`,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        ownerId: registration.ownerId,
        shopId: registration.shopId,
        deviceId: registration.deviceId,
        shopCodeSnapshot: registration.shopCode,
        deviceCodeSnapshot: registration.deviceCode,
        userId: registration.ownerId,
        userNameSnapshot: registration.ownerName,
        orderType,
        paymentMethod,
        referenceId: paymentMethod === "card" ? `REF-${compactDisplayDateKey(createdAt)}-${String(orderIndex + 1).padStart(2, "0")}` : "",
        subtotal: totals.subtotal,
        discount: totals.discount,
        adjustments: totals.adjustments,
        paymentAmount: paymentMethod === "card" ? totals.totalAmount : cashPaymentAmount,
        changeAmount: paymentMethod === "card" ? 0 : Math.max(0, cashPaymentAmount - totals.totalAmount),
        totalAmount: totals.totalAmount,
        vatEnabled: totals.vatEnabled,
        vatPercentage: totals.vatPercentage,
        vatInclusive: totals.vatInclusive,
        vatableSales: totals.vatableSales,
        vatAmount: totals.vatAmount,
        isServed: (dayIndex + orderIndex) % 7 !== 0,
        isVoided: false,
        voidReason: null,
        voidedAt: null,
      };
      const itemsForTransaction = lines.map((line) => ({
        ...line.transactionItem,
        transactionId,
      }));

      transactions.push(transaction);
      transactionItems.push(...itemsForTransaction);
      outboxEntries.push(
        createOutboxEntry("transaction.created", transaction.id, { transaction, transactionItems: itemsForTransaction }, transaction.createdAt),
      );
    }
  }

  if (transactions.length > 0) {
    await db.transaction("rw", db.transactions, db.transactionItems, db.syncOutbox, async () => {
      await db.transactions.bulkAdd(transactions);
      await db.transactionItems.bulkAdd(transactionItems);
      await db.syncOutbox.bulkAdd(outboxEntries);
    });
  }

  return {
    insertedTransactions: transactions.length,
    insertedTransactionItems: transactionItems.length,
    insertedOutboxEntries: outboxEntries.length,
    skippedExistingTransactions,
    startDate: isoDateKey(seedStartDate),
    endDate: isoDateKey(endDate),
    minTotal: transactions.length > 0 ? Math.min(...transactions.map((transaction) => transaction.totalAmount)) : null,
    maxTotal: transactions.length > 0 ? Math.max(...transactions.map((transaction) => transaction.totalAmount)) : null,
  };
}
