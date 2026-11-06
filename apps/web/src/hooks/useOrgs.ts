import type { ApiOrg } from "@accounting/shared";
import useSWR, { mutate } from "swr";
import { getFetcher, post } from "../api/api";

export function useOrgs() {
  const { data } = useSWR<ApiOrg[]>("/organizations", getFetcher);
  return { orgs: data };
}

export function useCreateOrg() {
  return async (name: string) => {
    const org = await post<ApiOrg>("/organizations", { name });
    await mutate("/organizations");
    await mutate("/user");
    return org;
  };
}
