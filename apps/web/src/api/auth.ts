import type { AuthSettings } from "@accounting/shared";
import useSWR, { mutate } from "swr";
import { apiEndpoint, getFetcher, post } from "./api";

type AuthResponse = { token: string; user: { id: string } };

export async function storeToken(token: string) {
  window.localStorage.setItem("user_token", token);
  // clear every cached response so nothing from a previous session leaks
  await mutate(() => true, undefined, { revalidate: true });
}

export async function logout() {
  window.localStorage.removeItem("user_token");
  await mutate(() => true, undefined, { revalidate: true });
}

export async function login(email: string, password: string): Promise<void> {
  const { token } = await post<AuthResponse>("/auth/login", { email, password });
  await storeToken(token);
}

export async function register(firstName: string, lastName: string, email: string, password: string): Promise<void> {
  const { token } = await post<AuthResponse>("/auth/register", { firstName, lastName, email, password });
  await storeToken(token);
}

// sign-in methods offered by this instance; password-only until the API answers
const defaultSettings: AuthSettings = { password: { enabled: true, signup: true }, sso: null };

export function useAuthSettings() {
  const { data, isLoading } = useSWR<AuthSettings>("/auth/settings", getFetcher, { revalidateOnFocus: false });
  return { settings: data ?? defaultSettings, isLoading };
}

// full-page navigation: the API redirects to the identity provider, which comes back to /auth/callback
export function startSso() {
  window.location.assign(`${apiEndpoint}/auth/oidc/login`);
}
