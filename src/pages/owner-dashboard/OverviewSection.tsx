import { Activity, BarChart3, Check, ChevronDown, CreditCard, Laptop } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { OwnerDashboardData, OwnerDevice } from "../../services/ownerDashboard";
import { formatDateTime, toDateInputValue } from "../../utils/dates";
import { formatPeso } from "../../utils/money";
import { Modal } from "../../components/Modal";
import { buildOverviewAnalytics } from "./analytics";
import { HorizontalBarChart } from "./charts/HorizontalBarChart";
import { PaymentSplitChart } from "./charts/PaymentSplitChart";
import { SalesTrendChart } from "./charts/SalesTrendChart";
import { DashboardPanel } from "./components/DashboardPanel";
import { EmptyText } from "./components/EmptyState";
import { DateInput } from "./components/FormControls";
import { MetricCard } from "./components/MetricCard";
import { StatusPill } from "./components/StatusPill";
import type { SalesGraphMode } from "./types";

type SalesTrendRangePreset = "7d" | "14d" | "1m" | "custom";

export function OverviewSection({ data }: { data: OwnerDashboardData }) {
  const [salesGraphMode, setSalesGraphMode] = useState<SalesGraphMode>("net");
  const today = toDateInputValue(new Date());
  const [trendPreset, setTrendPreset] = useState<SalesTrendRangePreset>("14d");
  const [customRange, setCustomRange] = useState(() => createRangeForDays(14));
  const [draftCustomRange, setDraftCustomRange] = useState(() => createRangeForDays(14));
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const trendRange = useMemo(() => {
    if (trendPreset === "custom") return normalizeRange(customRange.startDate, customRange.endDate, today);
    return createRangeForDays(trendPreset === "7d" ? 7 : trendPreset === "14d" ? 14 : 30, today);
  }, [customRange, today, trendPreset]);
  const completed = data.transactions.filter(({ transaction }) => !transaction.isVoided);
  const filteredCompleted = completed.filter(({ transaction }) => isTransactionInRange(transaction.createdAt, trendRange));
  const analytics = buildOverviewAnalytics(filteredCompleted, data.devices, data.configSnapshots, trendRange);
  const customLabel = rangeLabel(customRange);

  function handleTrendPresetChange(preset: SalesTrendRangePreset) {
    if (preset === "custom") {
      setDraftCustomRange(normalizeRange(customRange.startDate, customRange.endDate, today));
      setIsCustomModalOpen(true);
      return;
    }
    setTrendPreset(preset);
  }

  function handleDraftCustomStartChange(startDate: string) {
    const cappedStart = capDate(startDate, today);
    setDraftCustomRange((range) => ({
      startDate: cappedStart,
      endDate: range.endDate < cappedStart ? cappedStart : capDate(range.endDate, today),
    }));
  }

  function handleDraftCustomEndChange(endDate: string) {
    const cappedEnd = capDate(endDate, today);
    setDraftCustomRange((range) => ({
      startDate: range.startDate > cappedEnd ? cappedEnd : capDate(range.startDate, today),
      endDate: cappedEnd,
    }));
  }

  function applyCustomRange() {
    setCustomRange(normalizeRange(draftCustomRange.startDate, draftCustomRange.endDate, today));
    setTrendPreset("custom");
    setIsCustomModalOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-stone-950">Dashboard Filters</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DateRangeFilter
            customLabel={customLabel}
            onPresetChange={handleTrendPresetChange}
            preset={trendPreset}
          />
          <SalesModeFilter mode={salesGraphMode} onModeChange={setSalesGraphMode} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Net Sales" value={formatPeso(analytics.netSales)} />
        <MetricCard label="Transactions" value={String(analytics.transactions)} />
        <MetricCard label="Average Sale" value={formatPeso(analytics.averageSale)} />
        <MetricCard label="Active Devices" value={String(data.devices.filter((device) => device.status === "active").length)} />
      </div>

      <DashboardPanel
        title="Sales Summary"
        icon={<Activity size={19} />}
      >
        <div className="h-80">
          <SalesTrendChart mode={salesGraphMode} onModeChange={setSalesGraphMode} points={analytics.salesTrend} />
        </div>
      </DashboardPanel>

      <Modal isOpen={isCustomModalOpen} onClose={() => setIsCustomModalOpen(false)} title="Custom Sales Range">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DateInput label="From" max={today} value={draftCustomRange.startDate} onChange={handleDraftCustomStartChange} />
            <DateInput label="To" max={today} min={draftCustomRange.startDate} value={draftCustomRange.endDate} onChange={handleDraftCustomEndChange} />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCustomModalOpen(false)}
              className="min-h-11 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyCustomRange}
              className="min-h-11 rounded-lg bg-[#51A3A3] px-4 text-sm font-black text-white"
            >
              Apply
            </button>
          </div>
        </div>
      </Modal>

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
  { id: "14d", label: "14 Days" },
  { id: "7d", label: "7 Days" },
  { id: "1m", label: "30 Days" },
  { id: "custom", label: "Custom" },
];

const salesGraphModes: Array<{ id: SalesGraphMode; label: string }> = [
  { id: "net", label: "Net" },
  { id: "gross", label: "Gross" },
  { id: "all", label: "All" },
];

function DateRangeFilter({
  customLabel,
  onPresetChange,
  preset,
}: {
  customLabel: string;
  onPresetChange: (preset: SalesTrendRangePreset) => void;
  preset: SalesTrendRangePreset;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rangeLabelText = compactRangeLabel(preset, customLabel);

  function handlePresetClick(nextPreset: SalesTrendRangePreset) {
    onPresetChange(nextPreset);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-10 min-w-44 items-center justify-between gap-3 rounded-lg border border-stone-300 bg-white px-3 text-sm font-black text-stone-800 outline-none transition hover:border-[#51A3A3] focus:border-[#51A3A3]"
      >
        <span>{rangeLabelText}</span>
        <ChevronDown size={16} className={`shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-stone-200 bg-white p-2 shadow-xl">
          <FilterSection title="Date">
            {salesTrendPresets.map((option) => (
              <FilterOption
                key={option.id}
                isSelected={preset === option.id}
                label={option.label}
                onClick={() => handlePresetClick(option.id)}
              />
            ))}
          </FilterSection>
        </div>
      ) : null}
    </div>
  );
}

function SalesModeFilter({ mode, onModeChange }: { mode: SalesGraphMode; onModeChange: (mode: SalesGraphMode) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const modeLabel = salesGraphModes.find((option) => option.id === mode)?.label ?? "Net";

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-10 min-w-36 items-center justify-between gap-3 rounded-lg border border-stone-300 bg-white px-3 text-sm font-black text-stone-800 outline-none transition hover:border-[#51A3A3] focus:border-[#51A3A3]"
      >
        <span>{modeLabel}</span>
        <ChevronDown size={16} className={`shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-stone-200 bg-white p-2 shadow-xl">
          <FilterSection title="Sales Summary">
            {salesGraphModes.map((option) => (
              <FilterOption
                key={option.id}
                isSelected={mode === option.id}
                label={option.label}
                onClick={() => {
                  onModeChange(option.id);
                  setIsOpen(false);
                }}
              />
            ))}
          </FilterSection>
        </div>
      ) : null}
    </div>
  );
}

function compactRangeLabel(preset: SalesTrendRangePreset, customLabel: string) {
  if (preset === "7d") return "7D";
  if (preset === "14d") return "14D";
  if (preset === "1m") return "30D";
  return customLabel;
}

function FilterSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div>
      <p className="px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-stone-500">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterOption({
  isSelected,
  label,
  onClick,
}: {
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm font-bold ${
        isSelected ? "bg-[#EAF7F7] text-[#235F5F]" : "text-stone-700 hover:bg-stone-100"
      }`}
    >
      <span>{label}</span>
      {isSelected ? <Check size={16} /> : null}
    </button>
  );
}

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

function isTransactionInRange(createdAt: string, range: { startDate: string; endDate: string }) {
  const day = toDateInputValue(new Date(createdAt));
  return day >= range.startDate && day <= range.endDate;
}

function rangeLabel(range: { startDate: string; endDate: string }) {
  const start = new Date(`${range.startDate}T00:00:00`);
  const end = new Date(`${range.endDate}T00:00:00`);
  const formatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
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
