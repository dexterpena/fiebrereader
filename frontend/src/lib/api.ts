import { supabase } from "./supabase";

// Prefer a relative API base so the frontend works behind any host/proxy.
// If VITE_API_URL is provided, use it (e.g. "https://example.com/api").
// Strip a trailing slash to avoid double slashes when joining paths.
const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

function buildApiUrl(path: string): string {
  // Allow callers to pass paths with or without an "/api" prefix.
  const withoutApiPrefix = path.startsWith("/api")
    ? path.slice("/api".length)
    : path;

  const normalizedPath = withoutApiPrefix.startsWith("/")
    ? withoutApiPrefix
    : `/${withoutApiPrefix}`;

  return `${API_BASE}${normalizedPath}`;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Always get the fresh token from Supabase session
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(buildApiUrl(path), { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "API error");
  }

  return res.json();
}

export function imageProxyUrl(url: string): string {
  return buildApiUrl(
    `/api/reader/image-proxy?url=${encodeURIComponent(url)}`
  );
}

export function pdfDownloadUrl(chapterUrl: string): string {
  return buildApiUrl(
    `/api/reader/download-pdf?url=${encodeURIComponent(chapterUrl)}`
  );
}
