import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { createCredentialSecret, sha256Hex } from "../_shared/crypto.ts";

type ActivateRequest = {
  token: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ message: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
    const admin = createClient(supabaseUrl, serviceKey);
    const body = await request.json() as ActivateRequest;
    const tokenValue = body.token?.trim().toUpperCase();
    if (!tokenValue) return jsonResponse({ message: "Registration token is required." }, 400);

    const tokenHash = await sha256Hex(tokenValue);
    const { data: activationToken, error: tokenError } = await admin
      .from("device_activation_tokens")
      .select("id, shop_id, owner_id, device_code, device_name, status, expires_at")
      .eq("token_hash", tokenHash)
      .single();

    if (tokenError || !activationToken || activationToken.status !== "active") {
      return jsonResponse({ message: "Registration token is invalid or has already been used." }, 400);
    }

    if (new Date(activationToken.expires_at).getTime() <= Date.now()) {
      await admin.from("device_activation_tokens").update({ status: "expired" }).eq("id", activationToken.id);
      return jsonResponse({ message: "Registration token has expired." }, 400);
    }

    const credentialSecret = createCredentialSecret();
    const credentialSecretHash = await sha256Hex(credentialSecret);
    const registeredAt = new Date().toISOString();

    const { data: device, error: deviceError } = await admin
      .from("devices")
      .insert({
        shop_id: activationToken.shop_id,
        owner_id: activationToken.owner_id,
        device_code: activationToken.device_code,
        device_name: activationToken.device_name,
        credential_secret_hash: credentialSecretHash,
        status: "active",
        registered_at: registeredAt,
        last_seen_at: registeredAt,
      })
      .select("id, credential_id")
      .single();

    if (deviceError) throw deviceError;

    const { error: burnError } = await admin
      .from("device_activation_tokens")
      .update({
        status: "used",
        used_at: registeredAt,
        used_by_device_id: device.id,
      })
      .eq("id", activationToken.id)
      .eq("status", "active");

    if (burnError) throw burnError;

    const { data: profile, error: profileError } = await admin
      .from("owner_profiles")
      .select("owner_name, business_name")
      .eq("id", activationToken.owner_id)
      .single();
    if (profileError) throw profileError;

    const { data: shop, error: shopError } = await admin
      .from("shops")
      .select("shop_code")
      .eq("id", activationToken.shop_id)
      .single();
    if (shopError) throw shopError;

    return jsonResponse({
      ownerId: activationToken.owner_id,
      ownerName: profile.owner_name,
      businessName: profile.business_name,
      shopId: activationToken.shop_id,
      shopCode: shop.shop_code,
      deviceId: device.id,
      deviceCode: activationToken.device_code,
      deviceName: activationToken.device_name,
      credentialId: device.credential_id,
      credentialSecret,
      registeredAt,
    });
  } catch (error) {
    return jsonResponse({ message: error instanceof Error ? error.message : "Device activation failed." }, 500);
  }
});
