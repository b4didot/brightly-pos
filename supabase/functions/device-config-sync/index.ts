import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/crypto.ts";

type StatusRequest = {
  deviceId: string;
  requestId: string;
  status: "seen" | "accepted" | "applied" | "failed";
  errorMessage?: string;
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
      .select("id, credential_id, credential_secret_hash, status")
      .eq("id", deviceId)
      .eq("credential_id", credentialId)
      .single();

    if (deviceError || !device || device.status !== "active") {
      return jsonResponse({ message: "Device credentials are invalid." }, 401);
    }

    if (device.credential_secret_hash !== await sha256Hex(credentialSecret)) {
      return jsonResponse({ message: "Device credentials are invalid." }, 401);
    }

    const body = await request.json() as StatusRequest;
    if (body.deviceId !== deviceId || !body.requestId) {
      return jsonResponse({ message: "Request id and device id are required." }, 400);
    }

    const now = new Date().toISOString();
    const patch: Record<string, string | null> = {
      status: body.status,
      last_error: body.status === "failed" ? body.errorMessage ?? "Settings sync failed." : null,
    };

    if (body.status === "seen") patch.seen_at = now;
    if (body.status === "accepted") patch.accepted_at = now;
    if (body.status === "applied") patch.applied_at = now;
    if (body.status === "failed") patch.failed_at = now;

    const { error: updateError } = await admin
      .from("device_config_sync_requests")
      .update(patch)
      .eq("id", body.requestId)
      .eq("target_device_id", device.id);

    if (updateError) throw updateError;

    await admin.from("devices").update({ last_seen_at: now }).eq("id", device.id);
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ message: error instanceof Error ? error.message : "Could not update config sync status." }, 500);
  }
});
