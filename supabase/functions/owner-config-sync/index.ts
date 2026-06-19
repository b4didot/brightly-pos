import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";

type ConfigSyncRequest = {
  shopId: string;
  sourceDeviceId?: string | null;
  targetDeviceIds: string[];
  settingsPayload: unknown;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ message: "Method not allowed." }, 405);

  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError || !userResult.user) return jsonResponse({ message: "Not authenticated." }, 401);

    const body = await request.json() as ConfigSyncRequest;
    if (!body.shopId || !Array.isArray(body.targetDeviceIds) || body.targetDeviceIds.length === 0 || !body.settingsPayload) {
      return jsonResponse({ message: "Shop, target devices, and settings payload are required." }, 400);
    }

    const { data: shop, error: shopError } = await admin
      .from("shops")
      .select("id, owner_id")
      .eq("id", body.shopId)
      .eq("owner_id", userResult.user.id)
      .single();

    if (shopError || !shop) return jsonResponse({ message: "Shop not found." }, 404);

    const { data: devices, error: devicesError } = await admin
      .from("devices")
      .select("id")
      .eq("shop_id", body.shopId)
      .eq("owner_id", userResult.user.id)
      .eq("status", "active")
      .in("id", body.targetDeviceIds);

    if (devicesError) throw devicesError;
    const allowedTargetIds = new Set((devices ?? []).map((device) => device.id));
    const rows = body.targetDeviceIds
      .filter((deviceId) => allowedTargetIds.has(deviceId))
      .map((deviceId) => ({
        shop_id: body.shopId,
        owner_id: userResult.user.id,
        source_device_id: body.sourceDeviceId || null,
        target_device_id: deviceId,
        settings_payload: body.settingsPayload,
        status: "requested",
      }));

    if (rows.length === 0) {
      return jsonResponse({ message: "No active target devices were found." }, 400);
    }

    const { data: inserted, error: insertError } = await admin
      .from("device_config_sync_requests")
      .insert(rows)
      .select("id, shop_id, source_device_id, target_device_id, status, requested_at, seen_at, accepted_at, applied_at, failed_at, last_error, settings_payload");

    if (insertError) throw insertError;

    return jsonResponse({
      requests: (inserted ?? []).map((entry) => ({
        id: entry.id,
        shopId: entry.shop_id,
        sourceDeviceId: entry.source_device_id,
        targetDeviceId: entry.target_device_id,
        status: entry.status,
        requestedAt: entry.requested_at,
        seenAt: entry.seen_at,
        acceptedAt: entry.accepted_at,
        appliedAt: entry.applied_at,
        failedAt: entry.failed_at,
        lastError: entry.last_error,
        settingsPayload: entry.settings_payload,
      })),
    });
  } catch (error) {
    return jsonResponse({ message: error instanceof Error ? error.message : "Could not create config sync request." }, 500);
  }
});
