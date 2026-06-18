import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/crypto.ts";

type SyncEvent = {
  id: string;
  eventType: string;
  recordId: string;
  payload: unknown;
  createdAt: string;
};

type SyncRequest = {
  deviceId: string;
  events: SyncEvent[];
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ message: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
    const admin = createClient(supabaseUrl, serviceKey);
    const deviceId = request.headers.get("X-Brightly-Device-Id") ?? "";
    const credentialId = request.headers.get("X-Brightly-Credential-Id") ?? "";
    const credentialSecret = request.headers.get("X-Brightly-Credential-Secret") ?? "";

    if (!deviceId || !credentialId || !credentialSecret) {
      return jsonResponse({ message: "Device credentials are required." }, 401);
    }

    const { data: device, error: deviceError } = await admin
      .from("devices")
      .select("id, shop_id, credential_id, credential_secret_hash, status")
      .eq("id", deviceId)
      .eq("credential_id", credentialId)
      .single();

    if (deviceError || !device || device.status !== "active") {
      return jsonResponse({ message: "Device credentials are invalid." }, 401);
    }

    if (device.credential_secret_hash !== await sha256Hex(credentialSecret)) {
      return jsonResponse({ message: "Device credentials are invalid." }, 401);
    }

    const body = await request.json() as SyncRequest;
    const events = Array.isArray(body.events) ? body.events : [];
    if (body.deviceId !== deviceId) {
      return jsonResponse({ message: "Device id mismatch." }, 400);
    }

    const rows = events.map((event) => ({
      shop_id: device.shop_id,
      device_id: device.id,
      local_outbox_id: event.id,
      event_type: event.eventType,
      record_id: event.recordId,
      payload: event.payload,
      device_created_at: event.createdAt,
    }));

    if (rows.length > 0) {
      const { error: insertError } = await admin
        .from("sync_events")
        .upsert(rows, { onConflict: "device_id,local_outbox_id", ignoreDuplicates: true });
      if (insertError) throw insertError;
    }

    await admin.from("devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);

    return jsonResponse({
      acknowledgedIds: events.map((event) => event.id),
    });
  } catch (error) {
    return jsonResponse({ message: error instanceof Error ? error.message : "Sync failed." }, 500);
  }
});
