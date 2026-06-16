const apiBaseUrl = import.meta.env.VITE_BRIGHTLY_API_URL?.replace(/\/$/, "") ?? "";

export function hasApiBaseUrl() {
  return apiBaseUrl.length > 0;
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<TResponse> {
  if (!hasApiBaseUrl()) {
    throw new Error("Brightly API URL is not configured.");
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
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
