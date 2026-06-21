import type { DeviceConfigSnapshot, OwnerDevice, OwnerTransactionRecord } from "../../services/ownerDashboard";
import type { Item } from "../../types";
import { toDateInputValue } from "../../utils/dates";
import { formatPeso } from "../../utils/money";
import type { OverviewAnalytics } from "./types";

export function buildOverviewAnalytics(
  records: OwnerTransactionRecord[],
  devices: OwnerDevice[],
  configSnapshots: DeviceConfigSnapshot[] = [],
  trendRange?: { startDate: string; endDate: string },
  today = new Date(),
): OverviewAnalytics {
  const netSales = records.reduce((sum, { transaction }) => sum + transaction.totalAmount, 0);
  const cash = records.reduce((sum, { transaction }) => sum + (transaction.paymentMethod === "cash" ? transaction.totalAmount : 0), 0);
  const card = records.reduce((sum, { transaction }) => sum + (transaction.paymentMethod === "card" ? transaction.totalAmount : 0), 0);
  const salesByDay = new Map<string, { gross: number; net: number }>();
  const itemTotals = new Map<string, number>();
  const deviceTotals = new Map<string, number>();

  records.forEach(({ transaction, transactionItems }) => {
    const day = toDateInputValue(new Date(transaction.createdAt));
    const dayTotals = salesByDay.get(day) ?? { gross: 0, net: 0 };
    const discountTotal = transaction.discount?.computedAmount ?? 0;
    salesByDay.set(day, {
      gross: dayTotals.gross + transaction.subtotal,
      net: dayTotals.net + transaction.totalAmount - discountTotal,
    });
    deviceTotals.set(transaction.deviceId ?? "unknown", (deviceTotals.get(transaction.deviceId ?? "unknown") ?? 0) + transaction.totalAmount);

    transactionItems.forEach((item) => {
      itemTotals.set(item.itemNameSnapshot, (itemTotals.get(item.itemNameSnapshot) ?? 0) + item.quantity);
    });
  });

  return {
    averageSale: records.length > 0 ? netSales / records.length : 0,
    card,
    cash,
    deviceSales: [...deviceTotals.entries()]
      .map(([deviceId, value]) => ({ label: deviceName(devices, deviceId), value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5),
    netSales,
    salesTrend: createDateRangeKeys(trendRange?.startDate, trendRange?.endDate, today).map((label) => ({
      label,
      ...(salesByDay.get(label) ?? { gross: 0, net: 0 }),
    })),
    topItems: buildTopItems(itemTotals, configSnapshots),
    transactions: records.length,
  };
}

function buildTopItems(itemTotals: Map<string, number>, configSnapshots: DeviceConfigSnapshot[]) {
  const soldItems = [...itemTotals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
  if (soldItems.length >= 5) return soldItems.slice(0, 5);

  const soldLabels = new Set(soldItems.map((item) => item.label));
  const unsoldItems = extractSnapshotItems(configSnapshots)
    .filter((item) => !soldLabels.has(item.name))
    .map((item) => ({ label: item.name, value: 0 }));

  return [...soldItems, ...deterministicShuffle(unsoldItems).slice(0, 5 - soldItems.length)];
}

function extractSnapshotItems(configSnapshots: DeviceConfigSnapshot[]) {
  const itemsById = new Map<string, Pick<Item, "id" | "name">>();
  [...configSnapshots]
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .forEach((snapshot) => {
      const items = getSnapshotItems(snapshot.payload);
      items.forEach((item) => {
        if (!item.isAddOn && !itemsById.has(item.id)) {
          itemsById.set(item.id, { id: item.id, name: item.name });
        }
      });
    });

  return [...itemsById.values()];
}

function getSnapshotItems(payload: unknown): Item[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: { items?: unknown } }).data;
  return Array.isArray(data?.items) ? data.items.filter(isSnapshotItem) : [];
}

function isSnapshotItem(item: unknown): item is Item {
  return Boolean(
    item &&
      typeof item === "object" &&
      typeof (item as Item).id === "string" &&
      typeof (item as Item).name === "string" &&
      typeof (item as Item).isAddOn === "boolean",
  );
}

function deterministicShuffle<T extends { label: string }>(items: T[]) {
  return [...items].sort((left, right) => stableHash(left.label) - stableHash(right.label) || left.label.localeCompare(right.label));
}

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function createDateRangeKeys(startDate?: string, endDate?: string, today = new Date()) {
  if (!startDate || !endDate) return createRecentDateKeys(7, today);

  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  if (!start || !end) return createRecentDateKeys(7, today);

  const first = start <= end ? start : end;
  const last = start <= end ? end : start;
  const keys: string[] = [];
  const cursor = new Date(first);

  while (cursor <= last) {
    keys.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function createRecentDateKeys(dayCount: number, today = new Date()) {
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (dayCount - 1 - index));
    return toDateInputValue(date);
  });
}

function parseDateKey(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatChartDayLabel(label: string, index: number) {
  const parsed = parseDateKey(label);
  if (parsed) {
    return {
      day: new Intl.DateTimeFormat("en-PH", { weekday: "short" }).format(parsed),
      date: new Intl.DateTimeFormat("en-PH", { month: "short", day: "2-digit" }).format(parsed),
    };
  }

  return {
    day: label,
    date: `Day ${index + 1}`,
  };
}

export function formatCompactCurrency(value: number) {
  if (value >= 1000) {
    return `PHP ${Math.round(value / 1000)}k`;
  }
  return formatPeso(value);
}

export function deviceName(devices: OwnerDevice[], deviceId: string) {
  return devices.find((device) => device.id === deviceId)?.deviceName ?? "Unknown device";
}
