import type { ApiOrgMember } from "@accounting/shared";
import useSWR, { mutate } from "swr";
import { del, getFetcher, post } from "../api/api";

const key = (orgId: string) => `/organizations/${orgId}/members`;

export function useTeamMembers(orgId: string) {
  const { data, error, isLoading } = useSWR<ApiOrgMember[]>(key(orgId), getFetcher);
  return { teamMembers: data, isLoading, error };
}

export function useAddTeamMember(orgId: string) {
  return async (email: string) => {
    await post<ApiOrgMember>(key(orgId), { email });
    await mutate(key(orgId));
  };
}

export function useRemoveTeamMember(orgId: string) {
  return async (userId: string) => {
    await del(`${key(orgId)}/${userId}`);
    await mutate(key(orgId));
  };
}
