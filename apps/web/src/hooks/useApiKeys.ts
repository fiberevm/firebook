import type { ApiKey } from "@accounting/shared";
import useSWR, { mutate } from "swr";
import { del, getFetcher, post } from "../api/api";

const key = (orgId: string) => `/organization/${orgId}/api_keys`;

export function useApiKeys(orgId: string) {
  const { data } = useSWR<ApiKey[]>(key(orgId), getFetcher);
  return { apiKeys: data };
}

export function useCreateApiKey(orgId: string) {
  return async (name: string) => {
    await post<ApiKey>(key(orgId), { name, roles: ["*"] });
    await mutate(key(orgId));
  };
}

export function useDeleteApiKey(orgId: string) {
  return async (keyId: string) => {
    await del(`${key(orgId)}/${keyId}`);
    await mutate(key(orgId));
  };
}
