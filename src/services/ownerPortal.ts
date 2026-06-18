import { createId } from "../utils/id";
import { apiRequest, hasApiBaseUrl } from "./apiClient";
import { getSupabaseClient, hasSupabaseConfig, supabaseFunctionRequest } from "./supabaseClient";

export type OwnerAccount = {
  id: string;
  ownerName: string;
  businessName: string;
  email: string;
  password: string;
  createdAt: string;
};

export type OwnerSession = {
  ownerId: string;
  ownerName: string;
  businessName: string;
  shopId: string;
  shopCode: string;
  email: string;
  accessToken: string | null;
};

export type RegistrationToken = {
  token: string;
  ownerId: string;
  ownerName: string;
  businessName: string;
  shopId: string;
  shopCode: string;
  deviceCode: string;
  deviceName: string;
  status: "active" | "used" | "expired";
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
};

const ownersKey = "brightly-owner-accounts";
const sessionKey = "brightly-owner-session";
const tokensKey = "brightly-device-registration-tokens";

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

export function getOwnerSession() {
  return readJson<OwnerSession | null>(sessionKey, null);
}

export async function restoreOwnerSession() {
  if (!hasSupabaseConfig()) {
    return getOwnerSession();
  }

  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw new Error(error.message);
  if (!data.session) {
    window.localStorage.removeItem(sessionKey);
    return null;
  }

  if (!data.session.user.email_confirmed_at) {
    await getSupabaseClient().auth.signOut();
    window.localStorage.removeItem(sessionKey);
    return null;
  }

  const session = await ensureSupabaseOwnerSession(data.session.access_token);
  writeJson(sessionKey, session);
  return session;
}

export async function registerOwner(input: {
  ownerName: string;
  businessName: string;
  email: string;
  password: string;
}) {
  if (hasSupabaseConfig()) {
    const supabase = getSupabaseClient();
    const ownerName = input.ownerName.trim();
    const businessName = input.businessName.trim();
    const email = input.email.trim().toLowerCase();

    if (!ownerName || !businessName || !email || !input.password) {
      throw new Error("Complete all owner registration fields.");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          owner_name: ownerName,
          business_name: businessName,
        },
      },
    });

    if (error) throw new Error(error.message);

    if (!data.session || !data.user?.email_confirmed_at) {
      throw new Error("Check your email to verify your account, then log in.");
    }

    const session = await ensureSupabaseOwnerSession(data.session.access_token);
    writeJson(sessionKey, session);
    return session;
  }

  if (hasApiBaseUrl()) {
    const session = await apiRequest<OwnerSession>("/api/owners/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    writeJson(sessionKey, session);
    return session;
  }

  const owners = readJson<OwnerAccount[]>(ownersKey, []);
  const email = input.email.trim().toLowerCase();

  if (owners.some((owner) => owner.email === email)) {
    throw new Error("An owner account already exists for this email.");
  }

  const owner: OwnerAccount = {
    id: createId("owner"),
    ownerName: input.ownerName.trim(),
    businessName: input.businessName.trim(),
    email,
    password: input.password,
    createdAt: new Date().toISOString(),
  };

  if (!owner.ownerName || !owner.businessName || !owner.email || !owner.password) {
    throw new Error("Complete all owner registration fields.");
  }

  writeJson(ownersKey, [...owners, owner]);

  const session = ownerToSession(owner);
  writeJson(sessionKey, session);
  return session;
}

export async function loginOwner(emailInput: string, password: string) {
  if (hasSupabaseConfig()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput.trim().toLowerCase(),
      password,
    });

    if (error) throw new Error(error.message);
    if (!data.session) throw new Error("Could not start owner session.");
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new Error("Verify your email before logging in.");
    }

    const session = await ensureSupabaseOwnerSession(data.session.access_token);
    writeJson(sessionKey, session);
    return session;
  }

  if (hasApiBaseUrl()) {
    const session = await apiRequest<OwnerSession>("/api/owners/login", {
      method: "POST",
      body: JSON.stringify({ email: emailInput, password }),
    });
    writeJson(sessionKey, session);
    return session;
  }

  const email = emailInput.trim().toLowerCase();
  const owner = readJson<OwnerAccount[]>(ownersKey, []).find(
    (entry) => entry.email === email && entry.password === password,
  );

  if (!owner) {
    throw new Error("Invalid email or password.");
  }

  const session = ownerToSession(owner);
  writeJson(sessionKey, session);
  return session;
}

export async function logoutOwner() {
  const session = getOwnerSession();

  if (hasSupabaseConfig()) {
    await getSupabaseClient().auth.signOut();
    window.localStorage.removeItem(sessionKey);
    return;
  }

  if (hasApiBaseUrl() && session?.accessToken) {
    try {
      await apiRequest("/api/owners/logout", {
        method: "POST",
        token: session.accessToken,
      });
    } catch {
      // Local session cleanup should still happen if the remote logout fails.
    }
  }

  window.localStorage.removeItem(sessionKey);
}

export async function listRegistrationTokens(session: OwnerSession) {
  if (hasSupabaseConfig() && session.accessToken) {
    const { data, error } = await getSupabaseClient()
      .from("device_activation_tokens")
      .select("device_code, device_name, status, created_at, expires_at, used_at")
      .eq("shop_id", session.shopId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((token) => ({
      token: token.status === "active" ? "Generated token hidden" : "Token used",
      ownerId: session.ownerId,
      ownerName: session.ownerName,
      businessName: session.businessName,
      shopId: session.shopId,
      shopCode: session.shopCode,
      deviceCode: token.device_code,
      deviceName: token.device_name,
      status: token.status === "used" || token.status === "expired" ? token.status : "active",
      createdAt: token.created_at,
      expiresAt: token.expires_at,
      usedAt: token.used_at,
    }));
  }

  if (hasApiBaseUrl() && session?.accessToken) {
    return apiRequest<RegistrationToken[]>(`/api/shops/${session.shopId}/device-tokens`, {
      token: session.accessToken,
    });
  }

  return readJson<RegistrationToken[]>(tokensKey, []).filter((token) => token.ownerId === session.ownerId);
}

export async function createRegistrationToken(session: OwnerSession, deviceNameInput: string) {
  if (hasSupabaseConfig() && session.accessToken) {
    const token = await supabaseFunctionRequest<{
      token: string;
      ownerId: string;
      shopId: string;
      deviceCode: string;
      deviceName: string;
      status: "active" | "used" | "expired";
      createdAt: string;
      expiresAt: string;
      usedAt: string | null;
    }>("create-device-token", {
      method: "POST",
      accessToken: session.accessToken,
      body: JSON.stringify({
        shopId: session.shopId,
        deviceName: deviceNameInput,
      }),
    });

    return {
      token: token.token,
      ownerId: token.ownerId,
      ownerName: session.ownerName,
      businessName: session.businessName,
      shopId: token.shopId,
      shopCode: session.shopCode,
      deviceCode: token.deviceCode,
      deviceName: token.deviceName,
      status: token.status,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
    };
  }

  if (hasApiBaseUrl() && session.accessToken) {
    return apiRequest<RegistrationToken>(`/api/shops/${session.shopId}/device-tokens`, {
      method: "POST",
      token: session.accessToken,
      body: JSON.stringify({ deviceName: deviceNameInput }),
    });
  }

  const tokens = readJson<RegistrationToken[]>(tokensKey, []);
  const activeOwnerTokens = tokens.filter((token) => token.ownerId === session.ownerId);
  const createdCount = activeOwnerTokens.length + 1;
  const deviceCode = String(createdCount).padStart(2, "0");
  const token: RegistrationToken = {
    token: createReadableToken(),
    ownerId: session.ownerId,
    ownerName: session.ownerName,
    businessName: session.businessName,
    shopId: session.shopId,
    shopCode: session.shopCode,
    deviceCode,
    deviceName: deviceNameInput.trim() || `Register ${deviceCode}`,
    status: "active",
    createdAt: new Date().toISOString(),
    expiresAt: createTokenExpiry().toISOString(),
    usedAt: null,
  };

  writeJson(tokensKey, [token, ...tokens]);
  return token;
}

export type DeviceRegistrationResponse = {
  ownerId: string;
  ownerName: string;
  businessName: string;
  shopId: string;
  shopCode: string;
  deviceId: string;
  deviceCode: string;
  deviceName: string;
  credentialId: string;
  credentialSecret: string;
  registeredAt: string;
};

export async function consumeRegistrationToken(tokenInput: string) {
  if (hasSupabaseConfig()) {
    return supabaseFunctionRequest<DeviceRegistrationResponse>("activate-device", {
      method: "POST",
      body: JSON.stringify({ token: tokenInput.trim() }),
    });
  }

  if (hasApiBaseUrl()) {
    return apiRequest<DeviceRegistrationResponse>("/api/devices/register", {
      method: "POST",
      body: JSON.stringify({ token: tokenInput.trim() }),
    });
  }

  const tokenValue = tokenInput.trim().toUpperCase();
  const tokens = readJson<RegistrationToken[]>(tokensKey, []);
  const tokenIndex = tokens.findIndex((entry) => entry.token === tokenValue);
  const token = tokens[tokenIndex];

  if (!token || token.status !== "active" || isTokenExpired(token)) {
    throw new Error("Registration token is invalid or has already been used.");
  }

  const usedAt = new Date().toISOString();
  const nextToken: RegistrationToken = { ...token, status: "used", usedAt };
  tokens[tokenIndex] = nextToken;
  writeJson(tokensKey, tokens);

  return {
    ownerId: token.ownerId,
    ownerName: token.ownerName,
    businessName: token.businessName,
    shopId: token.shopId,
    shopCode: token.shopCode,
    deviceId: createId("dev"),
    deviceCode: token.deviceCode,
    deviceName: token.deviceName,
    credentialId: createId("cred"),
    credentialSecret: createId("secret"),
    registeredAt: usedAt,
  };
}

function ownerToSession(owner: OwnerAccount): OwnerSession {
  return {
    ownerId: owner.id,
    ownerName: owner.ownerName,
    businessName: owner.businessName,
    shopId: `${owner.id}_shop_01`,
    shopCode: "01",
    email: owner.email,
    accessToken: null,
  };
}

async function ensureSupabaseOwnerSession(accessToken: string): Promise<OwnerSession> {
  const supabase = getSupabaseClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const user = userResult.user;

  if (userError || !user) {
    throw new Error(userError?.message ?? "Owner session is not available.");
  }

  const ownerName = getMetadataString(user.user_metadata, "owner_name") || user.email?.split("@")[0] || "Owner";
  const businessName = getMetadataString(user.user_metadata, "business_name") || "Brightly Shop";
  const email = user.email ?? "";

  const { error: profileError } = await supabase
    .from("owner_profiles")
    .upsert({
      id: user.id,
      owner_name: ownerName,
      business_name: businessName,
      email,
    });

  if (profileError) throw new Error(profileError.message);

  const { data: existingShop, error: shopLookupError } = await supabase
    .from("shops")
    .select("id, name, shop_code")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (shopLookupError) throw new Error(shopLookupError.message);

  const shop = existingShop ?? await createSupabaseShop(user.id, businessName);

  return {
    ownerId: user.id,
    ownerName,
    businessName: shop.name || businessName,
    shopId: shop.id,
    shopCode: shop.shop_code,
    email,
    accessToken,
  };
}

async function createSupabaseShop(ownerId: string, businessName: string) {
  const { data, error } = await getSupabaseClient()
    .from("shops")
    .insert({
      owner_id: ownerId,
      name: businessName,
      shop_code: "01",
      business_details: {},
    })
    .select("id, name, shop_code")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

function createReadableToken() {
  return `BRT-${Math.random().toString(36).slice(2, 6)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`.toUpperCase();
}

function createTokenExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt;
}

export function isTokenExpired(token: Pick<RegistrationToken, "expiresAt" | "createdAt">) {
  const expiresAt = token.expiresAt ? new Date(token.expiresAt) : createLegacyExpiry(token.createdAt);
  return expiresAt.getTime() <= Date.now();
}

function createLegacyExpiry(createdAt: string) {
  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt;
}
