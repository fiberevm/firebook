import type { ApiError } from "@accounting/shared";

export const apiEndpoint = import.meta.env.VITE_API_ENDPOINT ?? "http://localhost:3000";

export const getUserToken = (): string | null => {
  return window.localStorage.getItem("user_token");
};

export const getHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const userToken = getUserToken();
  if (userToken) {
    headers["Authorization"] = "Bearer " + userToken;
  }

  return headers;
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`${apiEndpoint}${url}`, {
    method,
    headers: getHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as T & ApiError;

  if (!res.ok) {
    const message = data.message ?? (typeof data.error === "string" ? data.error : res.statusText);
    throw new HttpError(res.status, message || `Request failed with status ${res.status}`);
  }

  return data;
}

export const get = <T>(url: string) => request<T>("GET", url);
export const post = <T>(url: string, body: unknown) => request<T>("POST", url, body);
export const put = <T>(url: string, body: unknown) => request<T>("PUT", url, body);
export const del = <T = { ok: boolean }>(url: string) => request<T>("DELETE", url);

// SWR fetchers
export const getFetcher = <T>(url: string) => get<T>(url);

export type PostKey = {
  url: string;
  body: unknown;
};

export const getPostFetcher = <T>(params: PostKey) => post<T>(params.url, params.body);
