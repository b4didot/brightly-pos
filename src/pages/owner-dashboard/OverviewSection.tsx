import { Activity, BarChart3, CreditCard, Laptop } from "lucide-react";
import { useMemo, useState } from "react";
import type { OwnerDashboardData, OwnerDevice } from "../../services/ownerDashboard";
import { formatDateTime, toDateInputValue } from "../../utils/dates";
import { formatPeso } from "../../utils/money";
import { buildOverviewAnalytics } from "./analytics";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";
import { PaymentSplitChart } from "./charts/PaymentSplitChart";
import { SalesTrendChart } from "./charts/SalesTrendChart";
import { DashboardPanel } from "./components/DashboardPanel";
import { EmptyText } from "./components/EmptyState";
import { DateInput } from "./components/FormControls";
import { MetricCard } from "./components/MetricCard";
import { SegmentedControl } from "./components/SegmentedControl";
import { StatusPill } from "./components/StatusPill";
import type { SalesGraphMode } from "./types";

type SalesTrendRangePreset = "7d" | "14d" | "1m" | "custom";

export function OverviewSection({ data }: { data: OwnerDashboardData }) {
  const [salesGraphMode, setSalesGraphMode] = useState<SalesGraphMode>("all");
  const today = toDateInputValue(new Date());
  const [trendPreset, setTrendPreset] = useState<SalesTrendRangePreset>("7d");
  const [customRange, setCustomRange] = useState(() => createRangeForDays(7));
  const trendRange = useMemo(() => {
    if (trendPreset === "custom") return normalizeRange(customRange.startDate, customRange.endDate, today);
    return createRangeForDays(trendPreset === "7d" ? 7 : trendPreset === "14d" ? 14 : 30, today);
  }, [customRange, today, trendPreset]);
  const completed = data.transactions.filter(({ transaction }) => !transaction.isVoided);
  const analytics = buildOverviewAnalytics(completed, data.devices, data.configSnapshots, trendRange);

  function handleCustomStartChange(startDate: string) {
    const cappedStart = capDate(startDate, today);
    setCustomRange((range) => ({
      startDate: cappedStart,
      endDate: range.endDate < cappedStart ? cappedStart : capDate(range.endDate, today),
    }));
  }

  function handleCustomEndChange(endDate: string) {
    const cappedEnd = capDate(endDate, today);
    setCustomRange((range) => ({
      startDate: range.startDate > cappedEnd ? cappedEnd : capDate(range.startDate, today),
      endDate: cappedEnd,
    }));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Net Sales" value={formatPeso(analytics.netSales)} />
        <MetricCard label="Transactions" value={String(analytics.transactions)} />
        <MetricCard label="Average Sale" value={formatPeso(analytics.averageSale)} />
        <MetricCard label="Active Devices" value={String(data.devices.filter((device) => device.status === "active").length)} />
      </div>

      <DashboardPanel
        title={`Sales Over Time - ${rangeLabel(trendRange)}`}
        icon={<Activity size={19} />}
        action={<SegmentedControl mode={salesGraphMode} onChange={setSalesGraphMode} />}
      >
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {salesTrendPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setTrendPreset(preset.id)}
                className={`min-h-10 rounded-lg border px-3 text-sm font-bold ${trendPreset === preset.id ? "border-[#51A3A3] bg-[#EAF7F7] text-[#235F5F]" : "border-stone-300 bg-white text-stone-700"}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {trendPreset === "custom" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <DateInput label="Start" max={today} value={customRange.startDate} onChange={handleCustomStartChange} />
              <DateInput label="End" max={today} min={customRange.startDate} value={customRange.endDate} onChange={handleCustomEndChange} />
            </div>
          ) : null}
        </div>
        <div className="h-80">
          <SalesTrendChart mode={salesGraphMode} onModeChange={setSalesGraphMode} points={analytics.salesTrend} />
        </div>
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <DashboardPanel title="Top Selling Items" icon={<BarChart3 size={19} />}>
          <HorizontalBarChart rows={analytics.topItems} tone="primary" />
        </DashboardPanel>

        <DashboardPanel title="Payment Split" icon={<CreditCard size={19} />}>
          <PaymentSplitChart cash={analytics.cash} card={analytics.card} />
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <DashboardPanel title="Device Sales Contribution" icon={<Laptop size={19} />}>
          <HorizontalBarChart rows={analytics.deviceSales} tone="secondary" />
        </DashboardPanel>
        <DashboardPanel title="Device Sync Health" icon={<Laptop size={19} />}>
          <DeviceList devices={data.devices} />
        </DashboardPanel>
      </div>

      {completed.length === 0 ? (
        <p className="rounded-lg border px-3 py-2 text-sm font-semibold text-[#75485E]" style={{ backgroundColor: "#F5DFBF", borderColor: "#CB904D" }}>
          No synced transactions yet. The overview will populate as POS devices upload completed sales.
        </p>
      ) : null}
    </div>
  );
}

const salesTrendPresets: Array<{ id: SalesTrendRangePreset; label: string }> = [
  { id: "7d", label: "7 Days" },
  { id: "14d", label: "14 Days" },
  { id: "1m", label: "1 Month" },
  { id: "custom", label: "Custom" },
];

function createRangeForDays(dayCount: number, todayValue = toDateInputValue(new Date())) {
  const end = new Date(`${todayValue}T00:00:00`);
  const start = new Date(end);
  start.setDate(end.getDate() - (dayCount - 1));
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function normalizeRange(startDate: string, endDate: string, today: string) {
  const cappedStart = capDate(startDate, today);
  const cappedEnd = capDate(endDate, today);
  if (cappedStart > cappedEnd) {
    return { startDate: cappedEnd, endDate: cappedEnd };
  }
  return { startDate: cappedStart, endDate: cappedEnd };
}

function capDate(value: string, today: string) {
  return value > today ? today : value;
}

function rangeLabel(range: { startDate: string; endDate: string }) {
  const start = new Date(`${range.startDate}T00:00:00`);
  const end = new Date(`${range.endDate}T00:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return `${days}D`;
}

function DeviceList({ devices }: { devices: OwnerDevice[] }) {
  if (devices.length === 0) return <EmptyText>No devices have synced yet.</EmptyText>;
  return (
    <div className="space-y-2">
      {devices.map((device) => (
        <div key={device.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 p-3 text-sm">
          <div>
            <p className="font-bold">{device.deviceName}</p>
            <p className="text-stone-600">Last online: {device.lastSeenAt ? formatDateTime(device.lastSeenAt) : "Not online yet"}</p>
          </div>
          <StatusPill tone={device.status === "active" ? "success" : "muted"}>{device.status}</StatusPill>
        </div>
      ))}
    </div>
  );
}
