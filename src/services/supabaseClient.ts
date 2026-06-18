import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  "";

let browserClient: SupabaseClient | null = null;

export function hasSupabaseConfig() {
  return supabaseUrl.length > 0 && supabaseKey.length > 0;
}

export function getSupabaseClient() {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured.");
  }

  browserClient ??= createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  return browserClient;
}

export async function getSupabaseSession(): Promise<Session | null> {
  if (!hasSupabaseConfig()) return null;
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;
  return data.session;
}

export function getSupabaseFunctionsUrl() {
  const explicitUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.trim();
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");
  if (!supabaseUrl) return "";
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;
}

export async function supabaseFunctionRequest<TResponse>(
  functionName: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<TResponse> {
  const functionsUrl = getSupabaseFunctionsUrl();
  if (!functionsUrl) {
    throw new Error("Supabase functions URL is not configured.");
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("apikey", supabaseKey);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(`${functionsUrl}/${functionName}`, {
    ...options,
    headers,
  });

  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) as unknown : null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : "Request failed.";
    throw new Error(message);
  }

  return data as TResponse;
}
