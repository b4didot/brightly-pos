import type { ConfigSyncRequestStatus, DeviceConfigSyncRequest, DeviceRegistration, SyncOutboxEntry } from "../types";
import { apiRequest, hasApiBaseUrl } from "./apiClient";
import { hasSupabaseConfig, supabaseFunctionRequest } from "./supabaseClient";

export type SyncAcknowledgement = {
  acknowledgedIds: string[];
  configRequests?: DeviceConfigSyncRequest[];
};

export async function uploadSyncOutbox(
  registration: DeviceRegistration,
  entries: SyncOutboxEntry[],
): Promise<SyncAcknowledgement> {
  if (hasSupabaseConfig()) {
    if (!registration.deviceId || !registration.credentialId || !registration.credentialSecret) {
      throw new Error("Device credentials are not available.");
    }

    return supabaseFunctionRequest<SyncAcknowledgement>("sync-device-events", {
      method: "POST",
      headers: {
        "X-Brightly-Device-Id": registration.deviceId,
        "X-Brightly-Credential-Id": registration.credentialId,
        "X-Brightly-Credential-Secret": registration.credentialSecret,
      },
      body: JSON.stringify({
        deviceId: registration.deviceId,
        events: entries,
      }),
    });
  }

  if (!hasApiBaseUrl()) {
    return {
      acknowledgedIds: entries.map((entry) => entry.id),
    };
  }

  if (!registration.deviceId || !registration.credentialId || !registration.credentialSecret) {
    throw new Error("Device credentials are not available.");
  }

  return apiRequest<SyncAcknowledgement>("/api/devices/sync", {
    method: "POST",
    headers: {
      "X-Brightly-Device-Id": registration.deviceId,
      "X-Brightly-Credential-Id": registration.credentialId,
      "X-Brightly-Credential-Secret": registration.credentialSecret,
    },
    body: JSON.stringify({
      deviceId: registration.deviceId,
      events: entries,
    }),
  });
}

export async function updateConfigSyncRequestStatus(
  registration: DeviceRegistration,
  requestId: string,
  status: ConfigSyncRequestStatus,
  errorMessage?: string,
) {
  if (!hasSupabaseConfig() && !hasApiBaseUrl()) {
    return;
  }

  if (!registration.deviceId || !registration.credentialId || !registration.credentialSecret) {
    throw new Error("Device credentials are not available.");
  }

  const requestBody = JSON.stringify({
    deviceId: registration.deviceId,
    requestId,
    status,
    errorMessage,
  });

  if (hasSupabaseConfig()) {
    await supabaseFunctionRequest<{ success: boolean }>("device-config-sync", {
      method: "POST",
      headers: {
        "X-Brightly-Device-Id": registration.deviceId,
        "X-Brightly-Credential-Id": registration.credentialId,
        "X-Brightly-Credential-Secret": registration.credentialSecret,
      },
      body: requestBody,
    });
    return;
  }

  await apiRequest<{ success: boolean }>("/api/devices/config-sync/status", {
    method: "POST",
    headers: {
      "X-Brightly-Device-Id": registration.deviceId,
      "X-Brightly-Credential-Id": registration.credentialId,
      "X-Brightly-Credential-Secret": registration.credentialSecret,
    },
    body: requestBody,
  });
}
