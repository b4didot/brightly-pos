import type { DeviceRegistration, SyncOutboxEntry } from "../types";
import { apiRequest, hasApiBaseUrl } from "./apiClient";

export type SyncAcknowledgement = {
  acknowledgedIds: string[];
};

export async function uploadSyncOutbox(
  registration: DeviceRegistration,
  entries: SyncOutboxEntry[],
): Promise<SyncAcknowledgement> {
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
