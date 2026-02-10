const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "API error");
  }

  return res.json();
}

export function imageProxyUrl(url: string): string {
  return `${API_BASE}/api/reader/image-proxy?url=${encodeURIComponent(url)}`;
}

export function pdfDownloadUrl(chapterUrl: string): string {
  return `${API_BASE}/api/reader/download-pdf?url=${encodeURIComponent(chapterUrl)}`;
}
