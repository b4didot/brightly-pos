import { Activity, BarChart3, CreditCard, Laptop } from "lucide-react";
import { useState } from "react";
import type { OwnerDashboardData, OwnerDevice } from "../../services/ownerDashboard";
import { formatDateTime } from "../../utils/dates";
import { formatPeso } from "../../utils/money";
import { buildOverviewAnalytics } from "./analytics";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";
import { PaymentSplitChart } from "./charts/PaymentSplitChart";
import { SalesTrendChart } from "./charts/SalesTrendChart";
import { DashboardPanel } from "./components/DashboardPanel";
import { EmptyText } from "./components/EmptyState";
import { MetricCard } from "./components/MetricCard";
import { SegmentedControl } from "./components/SegmentedControl";
import { StatusPill } from "./components/StatusPill";
import type { SalesGraphMode } from "./types";

export function OverviewSection({ data }: { data: OwnerDashboardData }) {
  const [salesGraphMode, setSalesGraphMode] = useState<SalesGraphMode>("all");
  const completed = data.transactions.filter(({ transaction }) => !transaction.isVoided);
  const analytics = buildOverviewAnalytics(completed, data.devices);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Net Sales" value={formatPeso(analytics.netSales)} />
        <MetricCard label="Transactions" value={String(analytics.transactions)} />
        <MetricCard label="Average Sale" value={formatPeso(analytics.averageSale)} />
        <MetricCard label="Active Devices" value={String(data.devices.filter((device) => device.status === "active").length)} />
      </div>

      <DashboardPanel
        title="Sales Over Time · 14D"
        icon={<Activity size={19} />}
        action={<SegmentedControl mode={salesGraphMode} onChange={setSalesGraphMode} />}
      >
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
