import * as XLSX from "xlsx";
import type {
  ConfigSyncRequestStatus,
  DeviceConfigSyncRequest,
  OrderType,
  PaymentMethod,
  Transaction,
  TransactionItem,
} from "../types";
import { formatDateTime, isWithinDateRange } from "../utils/dates";
import { downloadFile } from "../utils/download";
import { toPesoNumber } from "../utils/money";
import { apiRequest, hasApiBaseUrl } from "./apiClient";
import { type OwnerSession } from "./ownerPortal";
import { getSupabaseClient, hasSupabaseConfig, supabaseFunctionRequest } from "./supabaseClient";

export type OwnerDevice = {
  id: string;
  deviceCode: string;
  deviceName: string;
  status: "active" | "disabled";
  registeredAt: string;
  lastSeenAt: string | null;
  lastTransactionSyncAt: string | null;
};

export type OwnerTransactionRecord = {
  transaction: Transaction;
  transactionItems: TransactionItem[];
  syncedAt: string;
};

export type DeviceConfigSnapshot = {
  id: string;
  shopId: string;
  deviceId: string;
  deviceName: string;
  exportedAt: string;
  uploadedAt: string;
  syncOrigin: "pos" | "push";
  settingsChangedAt: string | null;
  settingsChangeOrigin: "pos" | "push";
  payload: unknown;
};

export type OwnerConfigTemplate = {
  id: string;
  shopId: string;
  name: string;
  sourceDeviceId: string | null;
  sourceDeviceName: string | null;
  settingsPayload: unknown;
  createdAt: string;
  updatedAt: string;
};

export type OwnerDashboardData = {
  devices: OwnerDevice[];
  transactions: OwnerTransactionRecord[];
  configSnapshots: DeviceConfigSnapshot[];
  configRequests: DeviceConfigSyncRequest[];
  configTemplates: OwnerConfigTemplate[];
};

export type OwnerReportFilters = {
  startDate: string;
  endDate: string;
  deviceId: string;
  paymentMethod: "all" | PaymentMethod;
  orderType: "all" | OrderType;
  status: "all" | "completed" | "voided";
};

type SyncEventRow = {
  id: string;
  device_id: string;
  event_type: string;
  payload: unknown;
  created_at: string;
  device_created_at: string | null;
};

type ConfigRequestRow = {
  id: string;
  shop_id: string;
  source_device_id: string | null;
  target_device_id: string;
  status: ConfigSyncRequestStatus;
  requested_at: string;
  seen_at: string | null;
  accepted_at: string | null;
  applied_at: string | null;
  failed_at: string | null;
  last_error: string | null;
  settings_payload: unknown;
};

type ConfigTemplateRow = {
  id: string;
  shop_id: string;
  name: string;
  source_device_id: string | null;
  source_device_name: string | null;
  settings_payload: unknown;
  created_at: string;
  updated_at: string;
};

const localDisabledDevicesKey = "brightly-owner-disabled-devices";
const localConfigRequestsKey = "brightly-owner-config-requests";
const localConfigTemplatesKey = "brightly-owner-config-templates";

export async function loadOwnerDashboardData(session: OwnerSession): Promise<OwnerDashboardData> {
  if (hasSupabaseConfig()) {
    const supabase = getSupabaseClient();
    const [{ data: devices, error: devicesError }, { data: syncEvents, error: eventsError }, snapshotsResult, requestsResult, templatesResult] =
      await Promise.all([
        supabase
          .from("devices")
          .select("id, device_code, device_name, status, registered_at, last_seen_at")
          .eq("shop_id", session.shopId)
          .order("device_code", { ascending: true }),
        supabase
          .from("sync_events")
          .select("id, device_id, event_type, payload, created_at, device_created_at")
          .eq("shop_id", session.shopId)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("device_config_snapshots")
          .select("id, shop_id, device_id, device_name, exported_at, uploaded_at, payload")
          .eq("shop_id", session.shopId)
          .order("uploaded_at", { ascending: false }),
        supabase
          .from("device_config_sync_requests")
          .select("id, shop_id, source_device_id, target_device_id, status, requested_at, seen_at, accepted_at, applied_at, failed_at, last_error, settings_payload")
          .eq("shop_id", session.shopId)
          .order("requested_at", { ascending: false }),
        supabase
          .from("owner_config_templates")
          .select("id, shop_id, name, source_device_id, source_device_name, settings_payload, created_at, updated_at")
          .eq("shop_id", session.shopId)
          .order("updated_at", { ascending: false }),
      ]);

    if (devicesError) throw new Error(devicesError.message);
    if (eventsError) throw new Error(eventsError.message);

    const snapshots = isMissingOptionalOwnerTableError(snapshotsResult.error) ? [] : snapshotsResult.data;
    const requests = isMissingOptionalOwnerTableError(requestsResult.error) ? [] : requestsResult.data;
    const templates = isMissingOptionalOwnerTableError(templatesResult.error) ? [] : templatesResult.data;
    if (snapshotsResult.error && !isMissingOptionalOwnerTableError(snapshotsResult.error)) {
      throw new Error(snapshotsResult.error.message);
    }
    if (requestsResult.error && !isMissingOptionalOwnerTableError(requestsResult.error)) {
      throw new Error(requestsResult.error.message);
    }
    if (templatesResult.error && !isMissingOptionalOwnerTableError(templatesResult.error)) {
      throw new Error(templatesResult.error.message);
    }

    const eventRows = (syncEvents ?? []) as SyncEventRow[];
    const lastTransactionSyncByDevice = new Map<string, string>();
    eventRows.forEach((event) => {
      if (event.event_type.startsWith("transaction.") && !lastTransactionSyncByDevice.has(event.device_id)) {
        lastTransactionSyncByDevice.set(event.device_id, event.created_at);
      }
    });

    const ownerDevices: OwnerDevice[] = (devices ?? []).map((device) => ({
        id: device.id,
        deviceCode: device.device_code,
        deviceName: device.device_name,
        status: device.status === "disabled" ? "disabled" : "active",
        registeredAt: device.registered_at,
        lastSeenAt: device.last_seen_at,
        lastTransactionSyncAt: lastTransactionSyncByDevice.get(device.id) ?? null,
      }));
    const configSnapshots = mergeConfigSnapshots(
      (snapshots ?? []).map((snapshot) => ({
        id: snapshot.id,
        shopId: snapshot.shop_id,
        deviceId: snapshot.device_id,
        deviceName: snapshot.device_name,
        exportedAt: snapshot.exported_at,
        uploadedAt: snapshot.uploaded_at,
        syncOrigin: getSettingsSyncOrigin(snapshot.payload),
        settingsChangedAt: getSettingsChangedAt(snapshot.payload),
        settingsChangeOrigin: getSettingsChangeOrigin(snapshot.payload),
        payload: snapshot.payload,
      })),
      parseConfigSnapshotEvents(eventRows, session.shopId, ownerDevices),
    );

    return {
      devices: ownerDevices,
      transactions: parseTransactionEvents(eventRows),
      configSnapshots,
      configRequests: (requests ?? []).map(mapConfigRequestRow),
      configTemplates: (templates ?? []).map(mapConfigTemplateRow),
    };
  }

  if (hasApiBaseUrl() && session.accessToken) {
    const dashboardData = await apiRequest<OwnerDashboardData>(`/api/shops/${session.shopId}/dashboard`, {
      token: session.accessToken,
    });
    return {
      ...dashboardData,
      configTemplates: dashboardData.configTemplates ?? [],
    };
  }

  return loadLocalDashboardData(session);
}

function getSettingsSyncOrigin(payload: unknown): "pos" | "push" {
  if (!payload || typeof payload !== "object") {
    return "pos";
  }

  const syncOrigin = (payload as { syncOrigin?: unknown }).syncOrigin;
  return syncOrigin === "push" ? "push" : "pos";
}

function getSettingsChangedAt(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const settingsChange = (payload as { settingsChange?: { changedAt?: unknown } }).settingsChange;
  return typeof settingsChange?.changedAt === "string" ? settingsChange.changedAt : null;
}

function getSettingsChangeOrigin(payload: unknown): "pos" | "push" {
  if (!payload || typeof payload !== "object") {
    return "pos";
  }

  const settingsChange = (payload as { settingsChange?: { origin?: unknown } }).settingsChange;
  if (settingsChange?.origin === "push") {
    return "push";
  }

  return getSettingsSyncOrigin(payload);
}

function parseConfigSnapshotEvents(events: SyncEventRow[], shopId: string, devices: OwnerDevice[]): DeviceConfigSnapshot[] {
  const devicesById = new Map(devices.map((device) => [device.id, device]));
  return events
    .filter((event) => event.event_type === "settings.snapshot")
    .map((event) => {
      const device = devicesById.get(event.device_id);
      const payload = event.payload as { exportedAt?: unknown };
      const exportedAt = typeof payload?.exportedAt === "string" ? payload.exportedAt : event.device_created_at ?? event.created_at;
      return {
        id: `event-${event.id}`,
        shopId,
        deviceId: event.device_id,
        deviceName: device?.deviceName ?? "Unknown device",
        exportedAt,
        uploadedAt: event.created_at,
        syncOrigin: getSettingsSyncOrigin(event.payload),
        settingsChangedAt: getSettingsChangedAt(event.payload),
        settingsChangeOrigin: getSettingsChangeOrigin(event.payload),
        payload: event.payload,
      };
    });
}

function mergeConfigSnapshots(primary: DeviceConfigSnapshot[], fallback: DeviceConfigSnapshot[]) {
  const seen = new Set(primary.map((snapshot) => `${snapshot.deviceId}:${snapshot.exportedAt}`));
  return [...primary, ...fallback.filter((snapshot) => !seen.has(`${snapshot.deviceId}:${snapshot.exportedAt}`))]
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
}

export async function disableOwnerDevice(session: OwnerSession, deviceId: string) {
  if (hasSupabaseConfig()) {
    const { error } = await getSupabaseClient()
      .from("devices")
      .update({ status: "disabled" })
      .eq("shop_id", session.shopId)
      .eq("id", deviceId);
    if (error) throw new Error(error.message);
    return;
  }

  if (hasApiBaseUrl() && session.accessToken) {
    await apiRequest(`/api/shops/${session.shopId}/devices/${deviceId}/disable`, {
      method: "POST",
      token: session.accessToken,
    });
    return;
  }

  const disabled = readJson<string[]>(localDisabledDevicesKey, []);
  writeJson(localDisabledDevicesKey, [...new Set([...disabled, deviceId])]);
}

export async function createOwnerConfigSyncRequest(input: {
  session: OwnerSession;
  targetDeviceIds: string[];
  sourceDeviceId: string | null;
  settingsPayload: unknown;
}) {
  if (input.targetDeviceIds.length === 0) {
    throw new Error("Select at least one target device.");
  }

  if (hasSupabaseConfig() && input.session.accessToken) {
    return supabaseFunctionRequest<{ requests: DeviceConfigSyncRequest[] }>("owner-config-sync", {
      method: "POST",
      accessToken: input.session.accessToken,
      body: JSON.stringify({
        shopId: input.session.shopId,
        targetDeviceIds: input.targetDeviceIds,
        sourceDeviceId: input.sourceDeviceId,
        settingsPayload: input.settingsPayload,
      }),
    });
  }

  if (hasApiBaseUrl() && input.session.accessToken) {
    return apiRequest<{ requests: DeviceConfigSyncRequest[] }>(`/api/shops/${input.session.shopId}/config-sync-requests`, {
      method: "POST",
      token: input.session.accessToken,
      body: JSON.stringify(input),
    });
  }

  const requests = readJson<DeviceConfigSyncRequest[]>(localConfigRequestsKey, []);
  const created = input.targetDeviceIds.map((targetDeviceId) => ({
    id: `local-${crypto.randomUUID()}`,
    shopId: input.session.shopId,
    sourceDeviceId: input.sourceDeviceId,
    targetDeviceId,
    status: "requested" as const,
    requestedAt: new Date().toISOString(),
    seenAt: null,
    acceptedAt: null,
    appliedAt: null,
    failedAt: null,
    lastError: null,
    settingsPayload: input.settingsPayload,
  }));
  writeJson(localConfigRequestsKey, [...created, ...requests]);
  return { requests: created };
}

export async function saveOwnerConfigTemplate(input: {
  session: OwnerSession;
  templateId?: string;
  name: string;
  sourceDeviceId: string | null;
  sourceDeviceName: string | null;
  settingsPayload: unknown;
}) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Template name is required.");
  }

  const now = new Date().toISOString();

  if (hasSupabaseConfig() && input.session.accessToken) {
    const supabase = getSupabaseClient();
    if (input.templateId) {
      const { data, error } = await supabase
        .from("owner_config_templates")
        .update({
          name,
          source_device_id: input.sourceDeviceId,
          source_device_name: input.sourceDeviceName,
          settings_payload: input.settingsPayload,
          updated_at: now,
        })
        .eq("id", input.templateId)
        .eq("shop_id", input.session.shopId)
        .select("id, shop_id, name, source_device_id, source_device_name, settings_payload, created_at, updated_at")
        .single();
      if (error) throw new Error(error.message);
      return mapConfigTemplateRow(data as ConfigTemplateRow);
    }

    const { data, error } = await supabase
      .from("owner_config_templates")
      .insert({
        owner_id: input.session.ownerId,
        shop_id: input.session.shopId,
        name,
        source_device_id: input.sourceDeviceId,
        source_device_name: input.sourceDeviceName,
        settings_payload: input.settingsPayload,
      })
      .select("id, shop_id, name, source_device_id, source_device_name, settings_payload, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return mapConfigTemplateRow(data as ConfigTemplateRow);
  }

  const templates = readJson<OwnerConfigTemplate[]>(localConfigTemplatesKey, []);
  if (input.templateId) {
    const nextTemplates = templates.map((template) =>
      template.id === input.templateId && template.shopId === input.session.shopId
        ? {
            ...template,
            name,
            sourceDeviceId: input.sourceDeviceId,
            sourceDeviceName: input.sourceDeviceName,
            settingsPayload: input.settingsPayload,
            updatedAt: now,
          }
        : template,
    );
    writeJson(localConfigTemplatesKey, nextTemplates);
    const updated = nextTemplates.find((template) => template.id === input.templateId);
    if (updated) return updated;
  }

  const created: OwnerConfigTemplate = {
    id: `local-${crypto.randomUUID()}`,
    shopId: input.session.shopId,
    name,
    sourceDeviceId: input.sourceDeviceId,
    sourceDeviceName: input.sourceDeviceName,
    settingsPayload: input.settingsPayload,
    createdAt: now,
    updatedAt: now,
  };
  writeJson(localConfigTemplatesKey, [created, ...templates]);
  return created;
}

export async function deleteOwnerConfigTemplate(session: OwnerSession, templateId: string) {
  if (hasSupabaseConfig() && session.accessToken) {
    const { error } = await getSupabaseClient()
      .from("owner_config_templates")
      .delete()
      .eq("shop_id", session.shopId)
      .eq("id", templateId);
    if (error) throw new Error(error.message);
    return;
  }

  const templates = readJson<OwnerConfigTemplate[]>(localConfigTemplatesKey, []);
  writeJson(
    localConfigTemplatesKey,
    templates.filter((template) => !(template.id === templateId && template.shopId === session.shopId)),
  );
}

export async function updateOwnerProfile(input: {
  session: OwnerSession;
  ownerName: string;
  businessName: string;
}) {
  const ownerName = input.ownerName.trim();
  const businessName = input.businessName.trim();
  if (!ownerName || !businessName) throw new Error("Owner and shop names are required.");

  if (hasSupabaseConfig()) {
    const supabase = getSupabaseClient();
    const [{ error: profileError }, { error: shopError }] = await Promise.all([
      supabase.from("owner_profiles").update({ owner_name: ownerName, business_name: businessName }).eq("id", input.session.ownerId),
      supabase.from("shops").update({ name: businessName }).eq("id", input.session.shopId),
    ]);
    if (profileError) throw new Error(profileError.message);
    if (shopError) throw new Error(shopError.message);
  }

  const nextSession = { ...input.session, ownerName, businessName };
  window.localStorage.setItem("brightly-owner-session", JSON.stringify(nextSession));
  return nextSession;
}

export async function sendOwnerPasswordReset(email: string) {
  if (hasSupabaseConfig()) {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    });
    if (error) throw new Error(error.message);
  }
}

export function filterOwnerTransactions(
  transactions: OwnerTransactionRecord[],
  filters: OwnerReportFilters,
) {
  return transactions.filter(({ transaction }) => {
    const inDate = isWithinDateRange(transaction.createdAt, filters.startDate, filters.endDate);
    const matchesDevice = filters.deviceId === "all" || transaction.deviceId === filters.deviceId;
    const matchesPayment = filters.paymentMethod === "all" || transaction.paymentMethod === filters.paymentMethod;
    const matchesOrder = filters.orderType === "all" || transaction.orderType === filters.orderType;
    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "voided" ? transaction.isVoided : !transaction.isVoided);

    return inDate && matchesDevice && matchesPayment && matchesOrder && matchesStatus;
  });
}

export async function exportOwnerReport(input: {
  reportKind: string;
  format: "csv" | "xlsx";
  rows: Record<string, string | number>[];
  filename: string;
}) {
  const rows = input.rows.length > 0 ? input.rows : [{ Empty: "No rows for selected filters" }];
  if (input.format === "csv") {
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    await downloadFile({ data: csv, filename: `${input.filename}.csv`, mimeType: "text/csv" });
    return;
  }

  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, input.reportKind.slice(0, 31));
  await downloadFile({
    data: XLSX.write(workbook, { bookType: "xlsx", type: "base64" }),
    filename: `${input.filename}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    encoding: "base64",
  });
}

export function buildOwnerReportRows(
  reportKind: string,
  records: OwnerTransactionRecord[],
) {
  const completed = records.filter(({ transaction }) => !transaction.isVoided);
  if (reportKind === "sales-summary") {
    const totals = completed.reduce((sum, { transaction }) => {
      const discounts = transaction.discount?.computedAmount ?? 0;
      const adjustments = transaction.adjustments.reduce((value, adjustment) => value + adjustment.computedAmount, 0);
      return {
        transactions: sum.transactions + 1,
        subtotal: sum.subtotal + transaction.subtotal,
        discounts: sum.discounts + discounts,
        adjustments: sum.adjustments + adjustments,
        total: sum.total + transaction.totalAmount,
        vat: sum.vat + transaction.vatAmount,
      };
    }, { transactions: 0, subtotal: 0, discounts: 0, adjustments: 0, total: 0, vat: 0 });

    return [{
      Transactions: totals.transactions,
      Subtotal: toPesoNumber(totals.subtotal),
      Discounts: toPesoNumber(totals.discounts),
      Adjustments: toPesoNumber(totals.adjustments),
      "Net Sales": toPesoNumber(totals.total - totals.discounts - totals.adjustments - totals.vat),
      VAT: toPesoNumber(totals.vat),
      Total: toPesoNumber(totals.total),
    }];
  }

  if (reportKind === "sales-by-item" || reportKind === "sales-by-category") {
    const rows = new Map<string, { quantity: number; total: number }>();
    completed.forEach(({ transactionItems }) => {
      transactionItems.forEach((item) => {
        const key = reportKind === "sales-by-category" ? item.categoryNameSnapshot : item.itemNameSnapshot;
        const current = rows.get(key) ?? { quantity: 0, total: 0 };
        rows.set(key, { quantity: current.quantity + item.quantity, total: current.total + item.lineTotal });
      });
    });
    return [...rows.entries()].map(([label, row]) => ({
      [reportKind === "sales-by-category" ? "Category" : "Item"]: label,
      Quantity: row.quantity,
      Total: toPesoNumber(row.total),
    }));
  }

  if (reportKind === "sales-by-payment-type") {
    return (["cash", "card"] as PaymentMethod[]).map((method) => ({
      "Payment Type": method,
      Transactions: completed.filter(({ transaction }) => transaction.paymentMethod === method).length,
      Total: toPesoNumber(completed.reduce((sum, { transaction }) => sum + (transaction.paymentMethod === method ? transaction.totalAmount : 0), 0)),
    }));
  }

  if (reportKind === "discounts") {
    return completed.map(({ transaction }) => ({
      "Transaction Number": transaction.transactionNumber,
      "Date/Time": formatDateTime(transaction.createdAt),
      Discount: transaction.discount?.label ?? "",
      "Discount Total": toPesoNumber(transaction.discount?.computedAmount ?? 0),
      Total: toPesoNumber(transaction.totalAmount),
    }));
  }

  if (reportKind === "vat") {
    return completed.map(({ transaction }) => ({
      "Transaction Number": transaction.transactionNumber,
      "Date/Time": formatDateTime(transaction.createdAt),
      "VAT Enabled": transaction.vatEnabled ? "Yes" : "No",
      "VAT Percentage": transaction.vatPercentage,
      "VAT Amount": toPesoNumber(transaction.vatAmount),
      Total: toPesoNumber(transaction.totalAmount),
    }));
  }

  return records.map(({ transaction, transactionItems }) => ({
    "Transaction Number": transaction.transactionNumber,
    "Date/Time": formatDateTime(transaction.createdAt),
    Device: transaction.deviceCodeSnapshot ?? transaction.deviceId ?? "",
    Status: transaction.isVoided ? "Voided" : "Completed",
    "Void Reason": transaction.voidReason ?? "",
    Payment: transaction.paymentMethod,
    "Order Type": transaction.orderType,
    Items: transactionItems.map((item) => `${item.quantity}x ${item.itemNameSnapshot}`).join(", "),
    Subtotal: toPesoNumber(transaction.subtotal),
    Total: toPesoNumber(transaction.totalAmount),
  }));
}

function parseTransactionEvents(events: SyncEventRow[]) {
  const records = new Map<string, OwnerTransactionRecord>();
  [...events].reverse().forEach((event) => {
    if (event.event_type === "transaction.created") {
      const payload = event.payload as { transaction?: Transaction; transactionItems?: TransactionItem[] };
      if (payload.transaction) {
        records.set(payload.transaction.id, {
          transaction: payload.transaction,
          transactionItems: payload.transactionItems ?? [],
          syncedAt: event.created_at,
        });
      }
    }

    if (event.event_type === "transaction.served" || event.event_type === "transaction.voided") {
      const payload = event.payload as { transactionId?: string; reason?: string; updatedAt?: string };
      if (!payload.transactionId) return;
      const record = records.get(payload.transactionId);
      if (!record) return;
      records.set(payload.transactionId, {
        ...record,
        transaction: {
          ...record.transaction,
          isServed: event.event_type === "transaction.served" ? true : record.transaction.isServed,
          isVoided: event.event_type === "transaction.voided" ? true : record.transaction.isVoided,
          voidReason: event.event_type === "transaction.voided" ? payload.reason ?? null : record.transaction.voidReason,
          voidedAt: event.event_type === "transaction.voided" ? payload.updatedAt ?? event.device_created_at : record.transaction.voidedAt,
          updatedAt: payload.updatedAt ?? event.device_created_at ?? record.transaction.updatedAt,
        },
        syncedAt: event.created_at,
      });
    }
  });

  return [...records.values()].sort((left, right) => right.transaction.createdAt.localeCompare(left.transaction.createdAt));
}

function mapConfigRequestRow(row: ConfigRequestRow): DeviceConfigSyncRequest {
  return {
    id: row.id,
    shopId: row.shop_id,
    sourceDeviceId: row.source_device_id,
    targetDeviceId: row.target_device_id,
    status: row.status,
    requestedAt: row.requested_at,
    seenAt: row.seen_at,
    acceptedAt: row.accepted_at,
    appliedAt: row.applied_at,
    failedAt: row.failed_at,
    lastError: row.last_error,
    settingsPayload: row.settings_payload,
  };
}

function mapConfigTemplateRow(row: ConfigTemplateRow): OwnerConfigTemplate {
  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    sourceDeviceId: row.source_device_id,
    sourceDeviceName: row.source_device_name,
    settingsPayload: row.settings_payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function loadLocalDashboardData(session: OwnerSession): OwnerDashboardData {
  const tokens = readJson<Array<{
    ownerId: string;
    shopId: string;
    deviceCode: string;
    deviceName: string;
    status: string;
    createdAt: string;
    usedAt: string | null;
  }>>("brightly-device-registration-tokens", []);
  const disabled = new Set(readJson<string[]>(localDisabledDevicesKey, []));
  const devices = tokens
    .filter((token) => token.ownerId === session.ownerId && token.status === "used")
    .map((token) => {
      const id = `${token.shopId}_${token.deviceCode}`;
      return {
        id,
        deviceCode: token.deviceCode,
        deviceName: token.deviceName,
        status: disabled.has(id) ? "disabled" as const : "active" as const,
        registeredAt: token.usedAt ?? token.createdAt,
        lastSeenAt: token.usedAt,
        lastTransactionSyncAt: null,
      };
    });

  return {
    devices,
    transactions: [],
    configSnapshots: [],
    configRequests: readJson<DeviceConfigSyncRequest[]>(localConfigRequestsKey, []).filter((request) => request.shopId === session.shopId),
    configTemplates: readJson<OwnerConfigTemplate[]>(localConfigTemplatesKey, []).filter((template) => template.shopId === session.shopId),
  };
}

function readJson<T>(key: string, fallback: T): T {
  const value = window.localStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function isMissingOptionalOwnerTableError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.includes("schema cache") ||
    error.message?.includes("device_config_snapshots") ||
    error.message?.includes("device_config_sync_requests") ||
    error.message?.includes("owner_config_templates")
  );
}
