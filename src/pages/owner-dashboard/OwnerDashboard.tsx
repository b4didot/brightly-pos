import { BarChart3, CreditCard, Download, KeyRound, Laptop, LayoutDashboard, LogOut, Menu, Plus, QrCode, RefreshCw, Settings2, Trash2, UserRound, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import {
  buildOwnerReportRows,
  createOwnerConfigSyncRequest,
  disableOwnerDevice,
  exportOwnerReport,
  filterOwnerTransactions,
  loadOwnerDashboardData,
  sendOwnerPasswordReset,
  updateOwnerProfile,
  type OwnerDashboardData,
  type OwnerReportFilters,
} from "../../services/ownerDashboard";
import {
  createRegistrationToken,
  isTokenExpired,
  listRegistrationTokens,
  type OwnerSession,
  type RegistrationToken,
} from "../../services/ownerPortal";
import { formatDateTime } from "../../utils/dates";
import { OverviewSection } from "./OverviewSection";
import { deviceName } from "./analytics";
import { DashboardPanel } from "./components/DashboardPanel";
import { EmptyPanel, EmptyText } from "./components/EmptyState";
import { DateInput, Select } from "./components/FormControls";
import { MetricCard } from "./components/MetricCard";
import { StatusPill } from "./components/StatusPill";
import type { DashboardSection, DashboardSectionDefinition, ReportKind } from "./types";

const dashboardSections: DashboardSectionDefinition[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { id: "reports", label: "Reports", icon: <BarChart3 size={18} /> },
  { id: "devices", label: "Devices", icon: <Laptop size={18} /> },
  { id: "config", label: "Config Sync", icon: <Settings2 size={18} /> },
  { id: "profile", label: "Profile", icon: <UserRound size={18} /> },
  { id: "subscription", label: "Subscription", icon: <CreditCard size={18} /> },
];

const reportOptions: Array<{ id: ReportKind; label: string }> = [
  { id: "transaction-report", label: "Transaction Report" },
  { id: "sales-summary", label: "Sales Summary" },
  { id: "sales-by-item", label: "Sales by Item" },
  { id: "sales-by-category", label: "Sales by Category" },
  { id: "sales-by-payment-type", label: "Sales by Payment Type" },
  { id: "discounts", label: "Discounts" },
  { id: "vat", label: "VAT" },
];

export function OwnerDashboard({
  onLogout,
  onSessionChange,
  session,
}: {
  onLogout: () => void;
  onSessionChange: (session: OwnerSession) => void;
  session: OwnerSession;
}) {
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [dashboardData, setDashboardData] = useState<OwnerDashboardData>({
    devices: [],
    transactions: [],
    configSnapshots: [],
    configRequests: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [isNavOpen, setIsNavOpen] = useState(false);

  async function refreshDashboard() {
    setDashboardError("");
    setIsLoading(true);
    try {
      setDashboardData(await loadOwnerDashboardData(session));
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Could not load owner dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void loadOwnerDashboardData(session)
      .then((nextData) => {
        if (!cancelled) {
          setDashboardData(nextData);
          setDashboardError("");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setDashboardError(error instanceof Error ? error.message : "Could not load owner dashboard.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <main className="public-scroll-page min-h-screen bg-[#f6f3ee] text-stone-950">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsNavOpen(true)}
              className="grid size-11 shrink-0 place-items-center rounded-lg border border-stone-300 text-stone-800"
              aria-label="Open dashboard navigation"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#51A3A3]">Brightly Owner Dashboard</p>
              <h1 className="truncate text-xl font-black sm:text-2xl">{session.businessName}</h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button type="button" onClick={() => void refreshDashboard()} className="grid size-11 place-items-center rounded-lg border border-stone-300 text-stone-800" aria-label="Refresh dashboard">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </header>

      <DashboardDrawer
        activeSection={activeSection}
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        onLogout={onLogout}
        onRefresh={refreshDashboard}
        onSectionChange={setActiveSection}
      />

      <div className="mx-auto max-w-7xl px-4 py-4">
        <section className="min-w-0 space-y-4">
          {dashboardError ? <ErrorMessage message={dashboardError} /> : null}
          {isLoading ? <EmptyPanel title="Loading dashboard" body="Fetching synced devices, transactions, and config snapshots." /> : null}
          {!isLoading && activeSection === "overview" ? <OverviewSection data={dashboardData} /> : null}
          {!isLoading && activeSection === "reports" ? <ReportsSection data={dashboardData} /> : null}
          {!isLoading && activeSection === "devices" ? <DevicesSection session={session} data={dashboardData} onRefresh={refreshDashboard} /> : null}
          {!isLoading && activeSection === "config" ? <ConfigSyncSection session={session} data={dashboardData} onRefresh={refreshDashboard} /> : null}
          {!isLoading && activeSection === "profile" ? <ProfileSection session={session} onSessionChange={onSessionChange} /> : null}
          {!isLoading && activeSection === "subscription" ? <SubscriptionSection /> : null}
        </section>
      </div>
    </main>
  );
}

function DashboardDrawer({
  activeSection,
  isOpen,
  onClose,
  onLogout,
  onRefresh,
  onSectionChange,
}: {
  activeSection: DashboardSection;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onRefresh: () => Promise<void>;
  onSectionChange: (section: DashboardSection) => void;
}) {
  function handleSectionChange(section: DashboardSection) {
    onSectionChange(section);
    onClose();
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(320px,calc(100vw-2rem))] flex-col border-r border-stone-200 bg-white shadow-xl transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#51A3A3]">Dashboard</p>
            <p className="font-black">Owner Tools</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-lg border border-stone-300 text-stone-700"
            aria-label="Close dashboard navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="grid gap-1 p-3">
          {dashboardSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => handleSectionChange(section.id)}
              className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-left text-sm font-bold ${
                activeSection === section.id ? "bg-stone-950 text-white" : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto grid gap-2 border-t border-stone-200 p-3">
          <a href="/pos" className="grid min-h-11 place-items-center rounded-lg border border-stone-300 px-4 text-sm font-bold">
            POS
          </a>
          <button
            type="button"
            onClick={() => {
              void onRefresh();
              onClose();
            }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-bold"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white"
          >
            <LogOut size={17} />
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}

function ReportsSection({ data }: { data: OwnerDashboardData }) {
  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState<OwnerReportFilters>({
    startDate: today,
    endDate: today,
    deviceId: "all",
    paymentMethod: "all",
    orderType: "all",
    status: "all",
  });
  const [reportKind, setReportKind] = useState<ReportKind>("transaction-report");
  const [exporting, setExporting] = useState("");
  const records = useMemo(() => filterOwnerTransactions(data.transactions, filters), [data.transactions, filters]);
  const rows = useMemo<Record<string, string | number>[]>(() => buildOwnerReportRows(reportKind, records), [records, reportKind]);

  async function handleExport(format: "csv" | "xlsx") {
    setExporting(format);
    try {
      await exportOwnerReport({
        reportKind,
        format,
        rows,
        filename: `brightly-owner-${reportKind}-${filters.startDate}-to-${filters.endDate}`,
      });
    } finally {
      setExporting("");
    }
  }

  return (
    <DashboardPanel title="Reports" icon={<BarChart3 size={19} />}>
      <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Select label="Report" value={reportKind} onChange={(value) => setReportKind(value as ReportKind)} options={reportOptions.map((option) => ({ value: option.id, label: option.label }))} />
        <DateInput label="Start" value={filters.startDate} onChange={(value) => setFilters({ ...filters, startDate: value })} />
        <DateInput label="End" value={filters.endDate} onChange={(value) => setFilters({ ...filters, endDate: value })} />
        <Select label="Device" value={filters.deviceId} onChange={(value) => setFilters({ ...filters, deviceId: value })} options={[{ value: "all", label: "All devices" }, ...data.devices.map((device) => ({ value: device.id, label: device.deviceName }))]} />
        <Select label="Payment" value={filters.paymentMethod} onChange={(value) => setFilters({ ...filters, paymentMethod: value as OwnerReportFilters["paymentMethod"] })} options={[{ value: "all", label: "All" }, { value: "cash", label: "Cash" }, { value: "card", label: "Card" }]} />
        <Select label="Status" value={filters.status} onChange={(value) => setFilters({ ...filters, status: value as OwnerReportFilters["status"] })} options={[{ value: "all", label: "All" }, { value: "completed", label: "Completed" }, { value: "voided", label: "Voided" }]} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Select label="Order Type" value={filters.orderType} onChange={(value) => setFilters({ ...filters, orderType: value as OwnerReportFilters["orderType"] })} options={[{ value: "all", label: "All order types" }, { value: "dine-in", label: "Dine In" }, { value: "take-out", label: "Take Out" }]} />
        <button type="button" disabled={exporting !== ""} onClick={() => void handleExport("csv")} className="mt-auto flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-bold disabled:text-stone-300">
          <Download size={17} />
          {exporting === "csv" ? "Exporting..." : "CSV"}
        </button>
        <button type="button" disabled={exporting !== ""} onClick={() => void handleExport("xlsx")} className="mt-auto flex min-h-11 items-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white disabled:bg-stone-300">
          <Download size={17} />
          {exporting === "xlsx" ? "Exporting..." : "XLSX"}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-[0.12em] text-stone-500">
            <tr>{Object.keys(rows[0] ?? { Empty: "" }).map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.length === 0 ? (
              <tr><td className="px-3 py-8 text-center text-stone-500">No report rows for selected filters.</td></tr>
            ) : rows.slice(0, 20).map((row, index) => (
              <tr key={index}>{Object.keys(rows[0]).map((header) => <td key={header} className="px-3 py-3">{row[header]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardPanel>
  );
}

function DevicesSection({ data, onRefresh, session }: { data: OwnerDashboardData; onRefresh: () => Promise<void>; session: OwnerSession }) {
  const [deviceNameInput, setDeviceNameInput] = useState("");
  const [tokens, setTokens] = useState<RegistrationToken[]>([]);
  const [tokenError, setTokenError] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);

  useEffect(() => {
    void listRegistrationTokens(session).then(setTokens).catch((error: unknown) => setTokenError(error instanceof Error ? error.message : "Could not load device tokens."));
  }, [session]);

  async function handleCreateToken() {
    setTokenError("");
    setCreatingToken(true);
    try {
      const token = await createRegistrationToken(session, deviceNameInput);
      setDeviceNameInput("");
      setTokens([token, ...tokens]);
    } catch (error) {
      setTokenError(error instanceof Error ? error.message : "Could not generate device token.");
    } finally {
      setCreatingToken(false);
    }
  }

  async function handleDisableDevice(deviceId: string) {
    await disableOwnerDevice(session, deviceId);
    await onRefresh();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <DashboardPanel title="Add Device" icon={<KeyRound size={19} />}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={deviceNameInput} onChange={(event) => setDeviceNameInput(event.target.value)} placeholder="Device name" className="min-h-11 flex-1 rounded-lg border border-stone-300 px-3 outline-none focus:border-[#51A3A3]" />
          <button type="button" disabled={creatingToken} onClick={() => void handleCreateToken()} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white disabled:bg-stone-300">
            <Plus size={18} />
            {creatingToken ? "Generating..." : "Add Device"}
          </button>
        </div>
        {tokenError ? <div className="mt-3"><ErrorMessage message={tokenError} /></div> : null}
        <div className="mt-4 space-y-2">
          {tokens.length === 0 ? <EmptyText>No device tokens generated yet.</EmptyText> : tokens.map((token) => <TokenCard key={token.token} token={token} />)}
        </div>
      </DashboardPanel>

      <DashboardPanel title="Registered Devices" icon={<Laptop size={19} />}>
        <div className="space-y-2">
          {data.devices.length === 0 ? <EmptyText>No registered devices have synced yet.</EmptyText> : data.devices.map((device) => (
            <div key={device.id} className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{device.deviceName}</p>
                  <StatusPill tone={device.status === "active" ? "success" : "muted"}>{device.status}</StatusPill>
                </div>
                <p className="text-sm text-stone-600">Device {device.deviceCode} / Registered {formatDateTime(device.registeredAt)}</p>
                <p className="text-sm text-stone-600">Last transaction sync: {device.lastTransactionSyncAt ? formatDateTime(device.lastTransactionSyncAt) : "Not synced yet"}</p>
                <p className="text-sm text-stone-600">Last online: {device.lastSeenAt ? formatDateTime(device.lastSeenAt) : "Not online yet"}</p>
              </div>
              <button type="button" disabled={device.status === "disabled"} onClick={() => void handleDisableDevice(device.id)} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700 disabled:border-stone-200 disabled:text-stone-300">
                <Trash2 size={16} />
                Disable
              </button>
            </div>
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
}

function ConfigSyncSection({ data, onRefresh, session }: { data: OwnerDashboardData; onRefresh: () => Promise<void>; session: OwnerSession }) {
  const [sourceSnapshotId, setSourceSnapshotId] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const effectiveSourceSnapshotId = sourceSnapshotId || data.configSnapshots[0]?.id || "";
  const selectedSnapshot = data.configSnapshots.find((snapshot) => snapshot.id === effectiveSourceSnapshotId) ?? data.configSnapshots[0];

  function toggleDevice(deviceId: string) {
    setSelectedDevices((current) => current.includes(deviceId) ? current.filter((id) => id !== deviceId) : [...current, deviceId]);
  }

  async function handleRequestSync() {
    if (!selectedSnapshot) return;
    setSubmitting(true);
    setMessage("");
    try {
      await createOwnerConfigSyncRequest({
        session,
        sourceDeviceId: selectedSnapshot.deviceId,
        targetDeviceIds: selectedDevices,
        settingsPayload: selectedSnapshot.payload,
      });
      setMessage("Settings sync requested.");
      setSelectedDevices([]);
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not request settings sync.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <DashboardPanel title="Config Snapshots" icon={<Settings2 size={19} />}>
        {data.configSnapshots.length === 0 ? <EmptyText>No device config snapshots have uploaded yet.</EmptyText> : (
          <div className="space-y-2">
            <Select label="Source" value={effectiveSourceSnapshotId} onChange={setSourceSnapshotId} options={data.configSnapshots.map((snapshot) => ({ value: snapshot.id, label: `${snapshot.deviceName} / ${formatDateTime(snapshot.uploadedAt)}` }))} />
            <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
              Source device: <span className="font-bold">{selectedSnapshot?.deviceName}</span><br />
              Exported: {selectedSnapshot ? formatDateTime(selectedSnapshot.exportedAt) : "Not available"}<br />
              Uploaded: {selectedSnapshot ? formatDateTime(selectedSnapshot.uploadedAt) : "Not available"}
            </div>
          </div>
        )}
      </DashboardPanel>

      <DashboardPanel title="Request Device Sync" icon={<RefreshCw size={19} />}>
        <div className="space-y-2">
          {data.devices.filter((device) => device.status === "active").length === 0 ? <EmptyText>No active target devices available.</EmptyText> : data.devices.filter((device) => device.status === "active").map((device) => (
            <label key={device.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-stone-200 px-3">
              <input type="checkbox" checked={selectedDevices.includes(device.id)} onChange={() => toggleDevice(device.id)} className="size-4" />
              <span className="font-semibold">{device.deviceName}</span>
              <span className="text-sm text-stone-500">Device {device.deviceCode}</span>
            </label>
          ))}
        </div>
        <button type="button" disabled={!selectedSnapshot || selectedDevices.length === 0 || submitting} onClick={() => void handleRequestSync()} className="mt-3 min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white disabled:bg-stone-300">
          {submitting ? "Requesting..." : "Request Sync"}
        </button>
        {message ? <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm font-semibold text-stone-700">{message}</p> : null}
        <div className="mt-4 space-y-2">
          <h3 className="font-bold">Progress</h3>
          {data.configRequests.length === 0 ? <EmptyText>No config sync requests yet.</EmptyText> : data.configRequests.slice(0, 8).map((request) => (
            <div key={request.id} className="rounded-lg border border-stone-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{deviceName(data.devices, request.targetDeviceId)}</span>
                <StatusPill tone={request.status === "applied" ? "success" : request.status === "failed" ? "danger" : "warning"}>{request.status}</StatusPill>
              </div>
              <p className="mt-1 text-stone-600">Requested {formatDateTime(request.requestedAt)}</p>
              {request.lastError ? <p className="mt-1 font-semibold text-red-700">{request.lastError}</p> : null}
            </div>
          ))}
        </div>
      </DashboardPanel>
    </div>
  );
}

function ProfileSection({ onSessionChange, session }: { onSessionChange: (session: OwnerSession) => void; session: OwnerSession }) {
  const [ownerName, setOwnerName] = useState(session.ownerName);
  const [businessName, setBusinessName] = useState(session.businessName);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const nextSession = await updateOwnerProfile({ session, ownerName, businessName });
      onSessionChange(nextSession);
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    await sendOwnerPasswordReset(session.email);
    setMessage("Password reset instructions are available through your auth provider when configured.");
  }

  return (
    <DashboardPanel title="Profile" icon={<UserRound size={19} />}>
      <div className="grid max-w-xl gap-3">
        <TextInput label="Owner name" value={ownerName} onChange={setOwnerName} />
        <TextInput label="Shop name" value={businessName} onChange={setBusinessName} />
        <label className="block">
          <span className="text-sm font-bold text-stone-800">Email</span>
          <input value={session.email} disabled className="mt-2 min-h-12 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-base text-stone-500" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={saving} onClick={() => void handleSave()} className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white disabled:bg-stone-300">
            {saving ? "Saving..." : "Save Profile"}
          </button>
          <button type="button" onClick={() => void handlePasswordReset()} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold">
            Password Change
          </button>
        </div>
        {message ? <p className="rounded-lg bg-stone-50 p-3 text-sm font-semibold text-stone-700">{message}</p> : null}
      </div>
    </DashboardPanel>
  );
}

function SubscriptionSection() {
  return (
    <DashboardPanel title="Subscription" icon={<CreditCard size={19} />}>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Plan" value="Starter" />
        <MetricCard label="Billing" value="Pending" />
        <MetricCard label="Status" value="Prepared" />
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
        <p className="font-bold">Billing management is not connected yet.</p>
        <p className="mt-1 text-sm text-stone-600">This page is ready for plan changes, invoices, and payment management once the subscription backend is added.</p>
        <button type="button" disabled className="mt-3 min-h-11 rounded-lg bg-stone-300 px-4 font-bold text-white">
          Manage Subscription
        </button>
      </div>
    </DashboardPanel>
  );
}

function TokenCard({ token }: { token: RegistrationToken }) {
  const setupUrl = createDeviceSetupUrl(token.token);
  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Token</p>
            <p className="font-mono text-lg font-bold">{token.token}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Setup URL</p>
            <p className="break-all font-mono text-sm text-stone-700">{setupUrl}</p>
          </div>
          <p className="text-sm text-stone-600">{token.deviceName} / Device {token.deviceCode}</p>
        </div>
        <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end">
          <SetupQrCode value={setupUrl} />
          <StatusPill tone={token.status === "active" && !isTokenExpired(token) ? "success" : "muted"}>
            {token.status === "active" && isTokenExpired(token) ? "expired" : token.status}
          </StatusPill>
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Created {formatDateTime(token.createdAt)} / Expires {formatDateTime(token.expiresAt ?? createLegacyTokenExpiry(token.createdAt))}
      </p>
    </div>
  );
}

function SetupQrCode({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(value, { margin: 1, width: 132, color: { dark: "#1c1917", light: "#ffffff" } })
      .then((nextDataUrl) => {
        if (!cancelled) setDataUrl(nextDataUrl);
      })
      .catch(() => {
        if (!cancelled) setDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!dataUrl) {
    return <div className="grid h-[132px] w-[132px] place-items-center rounded-lg border border-stone-200 bg-stone-50 text-stone-500"><QrCode size={28} /></div>;
  }
  return <img src={dataUrl} alt="Device setup QR code" className="h-[132px] w-[132px] rounded-lg border border-stone-200 bg-white p-2" />;
}

function TextInput({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-stone-800">{label}</span>
      <input value={value} type={type} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 px-3 text-base outline-none focus:border-[#51A3A3]" />
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{message}</p>;
}

function createDeviceSetupUrl(token: string) {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const setupUrl = `${baseUrl.replace(/\/dashboard\/?$/, "")}/device/setup`;
  return `${setupUrl}?t=${encodeURIComponent(token)}`;
}

function createLegacyTokenExpiry(createdAt: string) {
  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt.toISOString();
}
