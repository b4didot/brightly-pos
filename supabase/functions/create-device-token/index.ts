import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { createReadableToken, sha256Hex } from "../_shared/crypto.ts";

type TokenRequest = {
  shopId: string;
  deviceName?: string;
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
    if (!userResult.user.email_confirmed_at) return jsonResponse({ message: "Verify your email before adding devices." }, 403);

    const body = await request.json() as TokenRequest;
    const shopId = body.shopId;
    if (!shopId) return jsonResponse({ message: "Shop is required." }, 400);

    const { data: shop, error: shopError } = await admin
      .from("shops")
      .select("id, owner_id")
      .eq("id", shopId)
      .eq("owner_id", userResult.user.id)
      .single();

    if (shopError || !shop) return jsonResponse({ message: "Shop not found." }, 404);

    const { count, error: countError } = await admin
      .from("device_activation_tokens")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId);
    if (countError) throw countError;

    const deviceCode = String((count ?? 0) + 1).padStart(2, "0");
    const token = createReadableToken();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data: insertedToken, error: insertError } = await admin
      .from("device_activation_tokens")
      .insert({
        shop_id: shopId,
        owner_id: userResult.user.id,
        token_hash: await sha256Hex(token),
        display_token: token,
        device_code: deviceCode,
        device_name: body.deviceName?.trim() || `Register ${deviceCode}`,
        status: "active",
        created_at: createdAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("display_token, device_code, device_name, status, created_at, expires_at, used_at")
      .single();

    if (insertError) throw insertError;

    return jsonResponse({
      token: insertedToken.display_token,
      ownerId: userResult.user.id,
      shopId,
      deviceCode: insertedToken.device_code,
      deviceName: insertedToken.device_name,
      status: insertedToken.status,
      createdAt: insertedToken.created_at,
      expiresAt: insertedToken.expires_at,
      usedAt: insertedToken.used_at,
    });
  } catch (error) {
    return jsonResponse({ message: error instanceof Error ? error.message : "Could not create device token." }, 500);
  }
});
