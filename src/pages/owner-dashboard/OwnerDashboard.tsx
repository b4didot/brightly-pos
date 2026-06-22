import { BadgePercent, Banknote, BarChart3, Check, CreditCard, Download, FolderOpen, KeyRound, Laptop, LayoutDashboard, Link2, ListPlus, LogOut, Menu, MonitorSmartphone, Percent, Plus, QrCode, RefreshCw, Save, Settings2, ShoppingBag, ShoppingCart, SlidersHorizontal, Trash2, UserRound, X } from "lucide-react";
import QRCode from "qrcode";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  buildOwnerReportRows,
  createOwnerConfigSyncRequest,
  deleteOwnerConfigTemplate,
  disableOwnerDevice,
  exportOwnerReport,
  filterOwnerTransactions,
  loadOwnerDashboardData,
  saveOwnerConfigTemplate,
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
import type { SettingsExportPayload } from "../../services/settingsTransfer";
import type { Category, Item, Modifier } from "../../types";
import { formatDateTime } from "../../utils/dates";
import { OverviewSection } from "./OverviewSection";
import { deviceName } from "./analytics";
import { DashboardPanel } from "./components/DashboardPanel";
import { EmptyPanel, EmptyText } from "./components/EmptyState";
import { DateInput, Select } from "./components/FormControls";
import { MetricCard } from "./components/MetricCard";
import { StatusPill } from "./components/StatusPill";
import type { DashboardSection, DashboardSectionDefinition, ReportKind } from "./types";
import { CollapsibleSection } from "../settings/CollapsibleSection";
import { ToggleRow as SettingsToggleRow } from "../settings/ToggleRow";

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
    configTemplates: [],
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
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templatePayload, setTemplatePayload] = useState<SettingsExportPayload>(() => createBlankSettingsPayload(session));
  const [templateSourceDeviceId, setTemplateSourceDeviceId] = useState<string | null>(null);
  const [templateSourceDeviceName, setTemplateSourceDeviceName] = useState<string | null>(null);
  const activeDevices = data.devices.filter((device) => device.status === "active");
  const selectedTemplate = data.configTemplates.find((template) => template.id === templateId);
  const canApply = selectedDevices.length > 0;

  const latestRequestByDevice = useMemo(() => {
    const requests = new Map<string, (typeof data.configRequests)[number]>();
    data.configRequests.forEach((request) => {
      if (!requests.has(request.targetDeviceId)) {
        requests.set(request.targetDeviceId, request);
      }
    });
    return requests;
  }, [data]);

  function latestSnapshotForDevice(device: OwnerDashboardData["devices"][number]) {
    return data.configSnapshots.find((snapshot) => snapshot.deviceId === device.id)
      ?? data.configSnapshots.find((snapshot) => snapshot.deviceName === device.deviceName)
      ?? null;
  }

  function toggleDevice(deviceId: string) {
    setSelectedDevices((current) => current.includes(deviceId) ? current.filter((id) => id !== deviceId) : [...current, deviceId]);
  }

  function handleCheckDevice(device: OwnerDashboardData["devices"][number]) {
    const snapshot = latestSnapshotForDevice(device);
    if (!snapshot) {
      setMessage(`No uploaded config snapshot was found for ${device.deviceName}. Refresh the dashboard after the POS sync completes.`);
      return;
    }

    setTemplateId("");
    setTemplateName(`${snapshot.deviceName} settings`);
    setTemplateSourceDeviceId(snapshot.deviceId);
    setTemplateSourceDeviceName(snapshot.deviceName);
    setTemplatePayload(normalizeSettingsPayload(snapshot.payload, session));
    setMessage(`Loaded latest settings from ${snapshot.deviceName}.`);
  }

  function handleLoadTemplate(nextTemplateId: string) {
    const template = data.configTemplates.find((entry) => entry.id === nextTemplateId);
    setTemplateId(nextTemplateId);
    if (!template) return;

    setTemplateName(template.name);
    setTemplateSourceDeviceId(template.sourceDeviceId);
    setTemplateSourceDeviceName(template.sourceDeviceName);
    setTemplatePayload(normalizeSettingsPayload(template.settingsPayload, session));
    setMessage(`Loaded template ${template.name}.`);
  }

  function handleNewTemplate() {
    setTemplateId("");
    setTemplateName("");
    setTemplateSourceDeviceId(null);
    setTemplateSourceDeviceName(null);
    setTemplatePayload(createBlankSettingsPayload(session));
    setMessage("");
  }

  function updatePayload(updater: (payload: SettingsExportPayload) => SettingsExportPayload) {
    setTemplatePayload((current) => updater(current));
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true);
    setMessage("");
    try {
      const saved = await saveOwnerConfigTemplate({
        session,
        templateId: templateId || undefined,
        name: templateName,
        sourceDeviceId: templateSourceDeviceId,
        sourceDeviceName: templateSourceDeviceName,
        settingsPayload: preparePayloadForSave(templatePayload),
      });
      setTemplateId(saved.id);
      setMessage(`Saved template ${saved.name}.`);
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save template.");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!templateId || !selectedTemplate) return;
    setMessage("");
    try {
      await deleteOwnerConfigTemplate(session, templateId);
      handleNewTemplate();
      setMessage("Template deleted.");
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete template.");
    }
  }

  async function handleRequestSync() {
    setSubmitting(true);
    setMessage("");
    try {
      await createOwnerConfigSyncRequest({
        session,
        sourceDeviceId: templateSourceDeviceId,
        targetDeviceIds: selectedDevices,
        settingsPayload: preparePayloadForSave(templatePayload),
      });
      setMessage("Settings sync requested. Devices will show pending until the POS accepts the push.");
      setSelectedDevices([]);
      setIsPushModalOpen(false);
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not request settings sync.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <DashboardPanel title="Registered Device Config" icon={<Laptop size={19} />}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.devices.length === 0 ? <EmptyText>No registered devices available.</EmptyText> : data.devices.map((device, index) => {
            const latestSnapshot = latestSnapshotForDevice(device);
            const latestRequest = latestRequestByDevice.get(device.id);
            const hasPendingRequest = latestRequest?.status === "requested" || latestRequest?.status === "seen";
            return (
              <div key={device.id} className="rounded-lg border border-stone-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Device {index + 1} of {data.devices.length}</p>
                    <h3 className="mt-1 text-lg font-black">{device.deviceName}</h3>
                    <p className="text-sm text-stone-600">Belongs to {session.businessName}</p>
                    <p className="text-xs text-stone-500">Code {device.deviceCode}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <StatusPill tone={device.status === "active" ? "success" : "muted"}>{device.status}</StatusPill>
                    {hasPendingRequest ? <StatusPill tone="warning">pending</StatusPill> : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-2 rounded-lg bg-stone-50 p-3 text-sm">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Last Config Sync</p>
                    <p className="font-semibold">{latestSnapshot ? formatDateTime(latestSnapshot.uploadedAt) : "Not synced yet"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Source</p>
                    <p className="font-semibold">{latestSnapshot ? (latestSnapshot.settingsChangeOrigin === "push" ? "PUSH" : "POS") : "Not available"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckDevice(device)}
                  className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-bold"
                >
                  <Check size={16} />
                  Check
                </button>
              </div>
            );
          })}
        </div>
      </DashboardPanel>

      <DashboardPanel title="Settings Editor" icon={<Settings2 size={19} />} action={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleNewTemplate} className="flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-bold">
            <Plus size={16} />
            New
          </button>
          <button
            type="button"
            onClick={() => setIsPushModalOpen(true)}
            className="flex min-h-10 items-center gap-2 rounded-lg bg-stone-950 px-3 text-sm font-bold text-white"
          >
            <RefreshCw size={16} />
            Push to Devices
          </button>
        </div>
      }>
        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <Select
              label="Saved Template"
              value={templateId}
              onChange={handleLoadTemplate}
              options={[{ value: "", label: "Manual / unsaved" }, ...data.configTemplates.map((template) => ({ value: template.id, label: template.name }))]}
            />
            <TextInput label="Template name" value={templateName} onChange={setTemplateName} />
          </div>
          <section className="mx-auto grid w-full max-w-7xl gap-4 px-3 py-3 sm:px-4 sm:py-4 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
            <EditorBlock icon={<ShoppingBag size={21} />} title="Shop">
              <TextInput label="Shop name" value={templatePayload.data.settings.shopName} onChange={(value) => updatePayload((payload) => updateSettings(payload, { shopName: value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorInput label="Primary color" value={templatePayload.data.settings.primaryColor} onChange={(value) => updatePayload((payload) => updateSettings(payload, { primaryColor: value }))} />
                <ColorInput label="Secondary color" value={templatePayload.data.settings.secondaryColor} onChange={(value) => updatePayload((payload) => updateSettings(payload, { secondaryColor: value }))} />
              </div>
            </EditorBlock>

            <EditorBlock icon={<MonitorSmartphone size={21} />} title="Device & Sync">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Template Source</p>
                  <p className="mt-1 font-bold text-stone-950">{templateSourceDeviceName ?? "Manual"}</p>
                </div>
                <div className="rounded-lg bg-white px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Saved Template</p>
                  <p className="mt-1 font-bold text-stone-950">{selectedTemplate?.name ?? (templateName || "Unsaved")}</p>
                </div>
              </div>
            </EditorBlock>

          <EditorBlock icon={<FolderOpen size={21} />} title="Categories">
            <div className="grid gap-2">
              {templatePayload.data.categories.map((category) => (
                <div key={category.id} className="grid gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
                  <TextInput label="Name" value={category.name} onChange={(value) => updatePayload((payload) => updateCategory(payload, category.id, { name: value }))} />
                  <ColorInput label="Color" value={category.defaultColor} onChange={(value) => updatePayload((payload) => updateCategory(payload, category.id, { defaultColor: value }))} />
                  <button type="button" onClick={() => updatePayload((payload) => deleteCategoryFromPayload(payload, category.id))} className="min-h-10 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700">
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => updatePayload(addCategoryToPayload)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold">
              Add Category
            </button>
          </EditorBlock>

          <EditorBlock icon={<ShoppingCart size={21} />} title="Items">
            <div className="grid gap-2">
              {templatePayload.data.items.filter((item) => !item.isAddOn).map((item) => (
                <div key={item.id} className="grid gap-2 rounded-lg border border-stone-200 p-3 lg:grid-cols-[1fr_8rem_12rem_auto_auto] lg:items-end">
                  <TextInput label="Name" value={item.name} onChange={(value) => updatePayload((payload) => updateItem(payload, item.id, { name: value }))} />
                  <NumberInput label="Price" value={item.price} onChange={(value) => updatePayload((payload) => updateItem(payload, item.id, { price: Math.max(0, value) }))} />
                  <Select
                    label="Category"
                    value={item.categoryId ?? ""}
                    onChange={(value) => updatePayload((payload) => updateItem(payload, item.id, { categoryId: value || null }))}
                    options={[{ value: "", label: "Uncategorized" }, ...templatePayload.data.categories.map((category) => ({ value: category.id, label: category.name }))]}
                  />
                  <SettingsToggleRow disabled={false} icon={<X size={20} />} label="Out" checked={item.isOutOfStock} onChange={(checked) => updatePayload((payload) => updateItem(payload, item.id, { isOutOfStock: checked }))} />
                  <button type="button" onClick={() => updatePayload((payload) => deleteItemFromPayload(payload, item.id))} className="min-h-10 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700">
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => updatePayload(addItemToPayload)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold">
              Add Item
            </button>
          </EditorBlock>

          <EditorBlock icon={<ListPlus size={21} />} title="Modifiers">
            <div className="grid gap-2">
              {templatePayload.data.modifiers.length === 0 ? <EmptyText>No modifiers configured.</EmptyText> : templatePayload.data.modifiers.map((modifier) => (
                <div key={modifier.id} className="grid gap-2 rounded-lg border border-stone-200 p-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                  <TextInput label="Label" value={modifier.label} onChange={(value) => updatePayload((payload) => updateModifier(payload, modifier.id, { label: value }))} />
                  <TextInput label="Options" value={modifier.options.join(", ")} onChange={(value) => updatePayload((payload) => updateModifier(payload, modifier.id, { options: value.split(",").map((option) => option.trim()).filter(Boolean) }))} />
                  <button type="button" onClick={() => updatePayload((payload) => deleteModifierFromPayload(payload, modifier.id))} className="min-h-10 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700">
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => updatePayload(addModifierToPayload)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold">
              Add Modifier
            </button>
          </EditorBlock>

          <EditorBlock icon={<Link2 size={21} />} title="Add-ons">
            <div className="grid gap-2">
              {templatePayload.data.items.filter((item) => item.isAddOn).length === 0 ? <EmptyText>No add-ons configured.</EmptyText> : templatePayload.data.items.filter((item) => item.isAddOn).map((item) => (
                <div key={item.id} className="grid gap-2 rounded-lg border border-stone-200 p-3 lg:grid-cols-[1fr_8rem_auto] lg:items-end">
                  <TextInput label="Name" value={item.name} onChange={(value) => updatePayload((payload) => updateItem(payload, item.id, { name: value }))} />
                  <NumberInput label="Price" value={item.price} onChange={(value) => updatePayload((payload) => updateItem(payload, item.id, { price: Math.max(0, value) }))} />
                  <button type="button" onClick={() => updatePayload((payload) => deleteItemFromPayload(payload, item.id))} className="min-h-10 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700">
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => updatePayload(addAddOnItemToPayload)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold">
              Add Add-on
            </button>
          </EditorBlock>
            </div>

            <div className="space-y-4">
            <EditorBlock icon={<SlidersHorizontal size={21} />} title="Adjustments">
              <div className="grid gap-2">
                {templatePayload.data.adjustments.length === 0 ? <EmptyText>No additional charges configured.</EmptyText> : templatePayload.data.adjustments.map((adjustment) => (
                  <div key={adjustment.id} className="grid gap-2 rounded-lg border border-stone-200 p-3 lg:grid-cols-[1fr_11rem_8rem_auto_auto] lg:items-end">
                    <TextInput label="Label" value={adjustment.label} onChange={(value) => updatePayload((payload) => updateAdjustment(payload, adjustment.id, { label: value }))} />
                    <Select
                      label="Type"
                      value={adjustment.type}
                      onChange={(value) => updatePayload((payload) => updateAdjustment(payload, adjustment.id, { type: value as "percentage" | "flat" }))}
                      options={[{ value: "percentage", label: "Percentage" }, { value: "flat", label: "Flat amount" }]}
                    />
                    <NumberInput label={adjustment.type === "flat" ? "Amount" : "Percent"} value={adjustment.type === "flat" ? adjustment.value / 100 : adjustment.value} onChange={(value) => updatePayload((payload) => updateAdjustment(payload, adjustment.id, { value: adjustment.type === "flat" ? Math.round(Math.max(0, value) * 100) : Math.max(0, value) }))} />
                    <SettingsToggleRow disabled={false} icon={<Check size={20} />} label="Auto" checked={adjustment.enabled} onChange={(checked) => updatePayload((payload) => updateAdjustment(payload, adjustment.id, { enabled: checked }))} />
                    <button type="button" onClick={() => updatePayload((payload) => deleteAdjustmentFromPayload(payload, adjustment.id))} className="min-h-10 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => updatePayload(addAdjustmentToPayload)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold">
                Add Adjustment
              </button>
            </EditorBlock>

            <EditorBlock icon={<BadgePercent size={21} />} title="Discounts">
              <SettingsToggleRow disabled={false} icon={<BadgePercent size={20} />} label="Enable checkout discounts" checked={templatePayload.data.settings.discountEnabled} onChange={(checked) => updatePayload((payload) => updateSettings(payload, { discountEnabled: checked }))} />
              <div className="grid gap-2">
                {templatePayload.data.discountTemplates.length === 0 ? <EmptyText>No discount templates configured.</EmptyText> : templatePayload.data.discountTemplates.map((discount) => (
                  <div key={discount.id} className="grid gap-2 rounded-lg border border-stone-200 p-3 lg:grid-cols-[1fr_11rem_8rem_auto] lg:items-end">
                    <TextInput label="Label" value={discount.label} onChange={(value) => updatePayload((payload) => updateDiscountTemplate(payload, discount.id, { label: value }))} />
                    <Select
                      label="Type"
                      value={discount.type}
                      onChange={(value) => updatePayload((payload) => updateDiscountTemplate(payload, discount.id, { type: value as "percentage" | "flat" }))}
                      options={[{ value: "percentage", label: "Percentage" }, { value: "flat", label: "Flat amount" }]}
                    />
                    <NumberInput label={discount.type === "flat" ? "Amount" : "Percent"} value={discount.type === "flat" ? discount.value / 100 : discount.value} onChange={(value) => updatePayload((payload) => updateDiscountTemplate(payload, discount.id, { value: discount.type === "flat" ? Math.round(Math.max(0, value) * 100) : Math.max(0, value) }))} />
                    <button type="button" onClick={() => updatePayload((payload) => deleteDiscountTemplateFromPayload(payload, discount.id))} className="min-h-10 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => updatePayload(addDiscountTemplateToPayload)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold">
                Add Discount Template
              </button>
            </EditorBlock>

            <EditorBlock icon={<Percent size={21} />} title="Inclusive VAT">
              <SettingsToggleRow disabled={false} icon={<Percent size={20} />} label="VAT Enabled" checked={templatePayload.data.settings.vatEnabled} onChange={(checked) => updatePayload((payload) => updateSettings(payload, { vatEnabled: checked }))} />
              <NumberInput label="VAT Percentage" value={templatePayload.data.settings.vatPercentage} onChange={(value) => updatePayload((payload) => updateSettings(payload, { vatPercentage: Math.max(0, value) }))} />
            </EditorBlock>

            <EditorBlock icon={<CreditCard size={21} />} title="Payment Options">
              <SettingsToggleRow disabled={templatePayload.data.settings.cashEnabled && !templatePayload.data.settings.cardEnabled} icon={<Banknote size={20} />} label="Cash" checked={templatePayload.data.settings.cashEnabled} onChange={(checked) => updatePayload((payload) => updateSettings(payload, { cashEnabled: checked }))} />
              <SettingsToggleRow disabled={templatePayload.data.settings.cardEnabled && !templatePayload.data.settings.cashEnabled} icon={<CreditCard size={20} />} label="Card" checked={templatePayload.data.settings.cardEnabled} onChange={(checked) => updatePayload((payload) => updateSettings(payload, { cardEnabled: checked }))} />
            </EditorBlock>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingTemplate}
              onClick={() => void handleSaveTemplate()}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 font-bold text-white disabled:bg-stone-300"
            >
              <Save size={17} />
              {savingTemplate ? "Saving..." : templateId ? "Save Template" : "Save New Template"}
            </button>
            <button
              type="button"
              disabled={!templateId || savingTemplate}
              onClick={() => void handleDeleteTemplate()}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 font-bold text-red-700 disabled:border-stone-200 disabled:text-stone-300"
            >
              <Trash2 size={17} />
              Delete Template
            </button>
          </div>
        </div>
        {message ? <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm font-semibold text-stone-700">{message}</p> : null}
      </DashboardPanel>

      <DashboardPanel title="Recent Config Requests" icon={<RefreshCw size={19} />}>
        <div className="mt-4 space-y-2">
          {data.configRequests.length === 0 ? <EmptyText>No config sync requests yet.</EmptyText> : data.configRequests.slice(0, 8).map((request) => (
            <div key={request.id} className="rounded-lg border border-stone-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{deviceName(data.devices, request.targetDeviceId)}</span>
                <StatusPill tone={configRequestTone(request.status)}>{request.status === "requested" || request.status === "seen" ? "pending" : request.status}</StatusPill>
              </div>
              <p className="mt-1 text-stone-600">Requested {formatDateTime(request.requestedAt)}</p>
              {request.lastError ? <p className="mt-1 font-semibold text-red-700">{request.lastError}</p> : null}
            </div>
          ))}
        </div>
      </DashboardPanel>

      {isPushModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Push Settings</p>
                <h3 className="text-lg font-black">Select Devices</h3>
              </div>
              <button type="button" onClick={() => setIsPushModalOpen(false)} className="grid size-10 place-items-center rounded-lg border border-stone-300" aria-label="Close push modal">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {activeDevices.length === 0 ? <EmptyText>No active devices available.</EmptyText> : activeDevices.map((device) => {
                const latestRequest = latestRequestByDevice.get(device.id);
                const hasPendingRequest = latestRequest?.status === "requested" || latestRequest?.status === "seen";
                return (
                  <label key={device.id} className="flex min-h-12 items-center gap-3 rounded-lg border border-stone-200 px-3">
                    <input type="checkbox" checked={selectedDevices.includes(device.id)} onChange={() => toggleDevice(device.id)} className="size-4" />
                    <span className="font-semibold">{device.deviceName}</span>
                    <span className="text-sm text-stone-500">Device {device.deviceCode}</span>
                    {hasPendingRequest ? <StatusPill tone="warning">pending</StatusPill> : null}
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setIsPushModalOpen(false)} className="min-h-11 rounded-lg border border-stone-300 px-4 font-bold">
                Cancel
              </button>
              <button
                type="button"
                disabled={!canApply || submitting}
                onClick={() => void handleRequestSync()}
                className="min-h-11 rounded-lg bg-stone-950 px-4 font-bold text-white disabled:bg-stone-300"
              >
                {submitting ? "Requesting..." : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function configRequestTone(status: string): "success" | "warning" | "danger" | "muted" {
  if (status === "applied") return "success";
  if (status === "failed") return "danger";
  if (status === "accepted") return "muted";
  return "warning";
}

function EditorBlock({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <CollapsibleSection icon={icon} isOpen={isOpen} title={title} onToggle={() => setIsOpen((current) => !current)}>
      <div className="grid gap-3">{children}</div>
    </CollapsibleSection>
  );
}

function ColorInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</span>
      <div className="mt-1 flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-2">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="size-8 rounded border-0 bg-transparent p-0" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 text-sm font-semibold outline-none" />
      </div>
    </label>
  );
}

function NumberInput({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 text-sm font-semibold outline-none focus:border-[#51A3A3]"
      />
    </label>
  );
}

function createBlankSettingsPayload(session: OwnerSession): SettingsExportPayload {
  const now = new Date().toISOString();
  return {
    format: "brightly-settings",
    version: 1,
    exportedAt: now,
    syncOrigin: "push",
    settingsChange: {
      changedAt: now,
      origin: "push",
    },
    source: {
      ownerId: session.ownerId,
      shopId: session.shopId,
      deviceId: null,
    },
    data: {
      settings: {
        id: "main",
        shopName: session.businessName || "Coffee Bar",
        primaryColor: "#d97706",
        secondaryColor: "#fffaf3",
        settingsUpdatedAt: now,
        settingsChangeOrigin: "push",
        cashEnabled: true,
        cardEnabled: true,
        vatEnabled: false,
        vatPercentage: 12,
        vatInclusive: true,
        discountEnabled: true,
      },
      categories: [],
      items: [],
      itemVariants: [],
      modifiers: [],
      itemModifiers: [],
      itemAddOns: [],
      adjustments: [],
      discountTemplates: [],
    },
  };
}

function normalizeSettingsPayload(payload: unknown, session: OwnerSession): SettingsExportPayload {
  const fallback = createBlankSettingsPayload(session);
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as Partial<SettingsExportPayload>;
  if (candidate.format !== "brightly-settings" || candidate.version !== 1 || !candidate.data) {
    return fallback;
  }

  return {
    ...fallback,
    ...candidate,
    source: {
      ...fallback.source,
      ...candidate.source,
    },
    data: {
      ...fallback.data,
      ...candidate.data,
      settings: {
        ...fallback.data.settings,
        ...candidate.data.settings,
        id: "main",
      },
      categories: Array.isArray(candidate.data.categories) ? candidate.data.categories : [],
      items: Array.isArray(candidate.data.items) ? candidate.data.items : [],
      itemVariants: Array.isArray(candidate.data.itemVariants) ? candidate.data.itemVariants : [],
      modifiers: Array.isArray(candidate.data.modifiers) ? candidate.data.modifiers : [],
      itemModifiers: Array.isArray(candidate.data.itemModifiers) ? candidate.data.itemModifiers : [],
      itemAddOns: Array.isArray(candidate.data.itemAddOns) ? candidate.data.itemAddOns : [],
      adjustments: Array.isArray(candidate.data.adjustments) ? candidate.data.adjustments : [],
      discountTemplates: Array.isArray(candidate.data.discountTemplates) ? candidate.data.discountTemplates : [],
    },
  };
}

function preparePayloadForSave(payload: SettingsExportPayload): SettingsExportPayload {
  const now = new Date().toISOString();
  return {
    ...payload,
    exportedAt: now,
    syncOrigin: "push",
    settingsChange: {
      changedAt: now,
      origin: "push",
    },
    data: {
      ...payload.data,
      settings: {
        ...payload.data.settings,
        id: "main",
        vatInclusive: true,
        settingsUpdatedAt: now,
        settingsChangeOrigin: "push",
      },
    },
  };
}

function updateSettings(payload: SettingsExportPayload, settings: Partial<SettingsExportPayload["data"]["settings"]>) {
  return {
    ...payload,
    data: {
      ...payload.data,
      settings: {
        ...payload.data.settings,
        ...settings,
      },
    },
  };
}

function updateCategory(payload: SettingsExportPayload, categoryId: string, changes: Partial<Category>) {
  return {
    ...payload,
    data: {
      ...payload.data,
      categories: payload.data.categories.map((category) => category.id === categoryId ? { ...category, ...changes } : category),
    },
  };
}

function addCategoryToPayload(payload: SettingsExportPayload) {
  const category: Category = {
    id: `cat-${crypto.randomUUID()}`,
    name: "New Category",
    defaultColor: "#e5e7eb",
    createdAt: new Date().toISOString(),
  };
  return {
    ...payload,
    data: {
      ...payload.data,
      categories: [...payload.data.categories, category],
    },
  };
}

function deleteCategoryFromPayload(payload: SettingsExportPayload, categoryId: string) {
  return {
    ...payload,
    data: {
      ...payload.data,
      categories: payload.data.categories.filter((category) => category.id !== categoryId),
      items: payload.data.items.map((item) => item.categoryId === categoryId ? { ...item, categoryId: null } : item),
    },
  };
}

function updateItem(payload: SettingsExportPayload, itemId: string, changes: Partial<Item>) {
  return {
    ...payload,
    data: {
      ...payload.data,
      items: payload.data.items.map((item) => item.id === itemId ? { ...item, ...changes } : item),
    },
  };
}

function addItemToPayload(payload: SettingsExportPayload) {
  const item: Item = {
    id: `item-${crypto.randomUUID()}`,
    name: "New Item",
    price: 0,
    categoryId: payload.data.categories[0]?.id ?? null,
    isOutOfStock: false,
    isAddOn: false,
    createdAt: new Date().toISOString(),
  };
  return {
    ...payload,
    data: {
      ...payload.data,
      items: [...payload.data.items, item],
    },
  };
}

function deleteItemFromPayload(payload: SettingsExportPayload, itemId: string) {
  return {
    ...payload,
    data: {
      ...payload.data,
      items: payload.data.items.filter((item) => item.id !== itemId),
      itemVariants: payload.data.itemVariants.filter((variant) => variant.itemId !== itemId),
      itemModifiers: payload.data.itemModifiers.filter((link) => link.itemId !== itemId),
      itemAddOns: payload.data.itemAddOns.filter((link) => link.itemId !== itemId && link.addOnItemId !== itemId),
    },
  };
}

function addAddOnItemToPayload(payload: SettingsExportPayload) {
  const item: Item = {
    id: `addon-${crypto.randomUUID()}`,
    name: "New Add-on",
    price: 0,
    categoryId: null,
    isOutOfStock: false,
    isAddOn: true,
    createdAt: new Date().toISOString(),
  };
  return {
    ...payload,
    data: {
      ...payload.data,
      items: [...payload.data.items, item],
    },
  };
}

function updateModifier(payload: SettingsExportPayload, modifierId: string, changes: Partial<Modifier>) {
  return {
    ...payload,
    data: {
      ...payload.data,
      modifiers: payload.data.modifiers.map((modifier) => modifier.id === modifierId ? { ...modifier, ...changes } : modifier),
    },
  };
}

function addModifierToPayload(payload: SettingsExportPayload) {
  const modifier: Modifier = {
    id: `mod-${crypto.randomUUID()}`,
    label: "New Modifier",
    options: ["Option 1"],
    createdAt: new Date().toISOString(),
  };
  return {
    ...payload,
    data: {
      ...payload.data,
      modifiers: [...payload.data.modifiers, modifier],
    },
  };
}

function deleteModifierFromPayload(payload: SettingsExportPayload, modifierId: string) {
  return {
    ...payload,
    data: {
      ...payload.data,
      modifiers: payload.data.modifiers.filter((modifier) => modifier.id !== modifierId),
      itemModifiers: payload.data.itemModifiers.filter((link) => link.modifierId !== modifierId),
    },
  };
}

function updateDiscountTemplate(
  payload: SettingsExportPayload,
  discountId: string,
  changes: Partial<SettingsExportPayload["data"]["discountTemplates"][number]>,
) {
  return {
    ...payload,
    data: {
      ...payload.data,
      discountTemplates: payload.data.discountTemplates.map((discount) =>
        discount.id === discountId ? { ...discount, ...changes } : discount,
      ),
    },
  };
}

function addDiscountTemplateToPayload(payload: SettingsExportPayload) {
  const discount: SettingsExportPayload["data"]["discountTemplates"][number] = {
    id: `disc-${crypto.randomUUID()}`,
    label: "New Discount",
    type: "percentage",
    value: 0,
    createdAt: new Date().toISOString(),
  };
  return {
    ...payload,
    data: {
      ...payload.data,
      discountTemplates: [...payload.data.discountTemplates, discount],
    },
  };
}

function deleteDiscountTemplateFromPayload(payload: SettingsExportPayload, discountId: string) {
  return {
    ...payload,
    data: {
      ...payload.data,
      discountTemplates: payload.data.discountTemplates.filter((discount) => discount.id !== discountId),
    },
  };
}

function updateAdjustment(
  payload: SettingsExportPayload,
  adjustmentId: string,
  changes: Partial<SettingsExportPayload["data"]["adjustments"][number]>,
) {
  return {
    ...payload,
    data: {
      ...payload.data,
      adjustments: payload.data.adjustments.map((adjustment) =>
        adjustment.id === adjustmentId ? { ...adjustment, ...changes } : adjustment,
      ),
    },
  };
}

function addAdjustmentToPayload(payload: SettingsExportPayload) {
  const adjustment: SettingsExportPayload["data"]["adjustments"][number] = {
    id: `adj-${crypto.randomUUID()}`,
    label: "New Adjustment",
    type: "percentage",
    value: 0,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  return {
    ...payload,
    data: {
      ...payload.data,
      adjustments: [...payload.data.adjustments, adjustment],
    },
  };
}

function deleteAdjustmentFromPayload(payload: SettingsExportPayload, adjustmentId: string) {
  return {
    ...payload,
    data: {
      ...payload.data,
      adjustments: payload.data.adjustments.filter((adjustment) => adjustment.id !== adjustmentId),
    },
  };
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
