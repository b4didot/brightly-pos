import type { OwnerDevice, OwnerTransactionRecord } from "../../services/ownerDashboard";
import { formatPeso } from "../../utils/money";
import type { OverviewAnalytics } from "./types";

export function buildOverviewAnalytics(
  records: OwnerTransactionRecord[],
  devices: OwnerDevice[],
  today = new Date(),
): OverviewAnalytics {
  const netSales = records.reduce((sum, { transaction }) => sum + transaction.totalAmount, 0);
  const cash = records.reduce((sum, { transaction }) => sum + (transaction.paymentMethod === "cash" ? transaction.totalAmount : 0), 0);
  const card = records.reduce((sum, { transaction }) => sum + (transaction.paymentMethod === "card" ? transaction.totalAmount : 0), 0);
  const salesByDay = new Map<string, { gross: number; net: number }>();
  const itemTotals = new Map<string, number>();
  const deviceTotals = new Map<string, number>();

  records.forEach(({ transaction, transactionItems }) => {
    const day = transaction.createdAt.slice(0, 10);
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
    salesTrend: createRecentDateKeys(14, today).map((label) => ({
      label,
      ...(salesByDay.get(label) ?? { gross: 0, net: 0 }),
    })),
    topItems: [...itemTotals.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 5),
    transactions: records.length,
  };
}

export function createRecentDateKeys(dayCount: number, today = new Date()) {
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (dayCount - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

export function formatChartDayLabel(label: string, index: number) {
  const parsed = new Date(label);
  if (!Number.isNaN(parsed.getTime())) {
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
