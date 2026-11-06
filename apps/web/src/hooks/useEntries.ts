import type { ApiEntriesResponse, ApiEntry } from "@accounting/shared";
import useSWR, { mutate } from "swr";
import { del, getFetcher, getPostFetcher, type PostKey } from "../api/api";

const entriesUrl = (orgId: string) => `/organization/${orgId}/entries`;

const emptyStatement: ApiEntriesResponse["statement"] = {
  income: 0,
  expenses: 0,
  expensesByCurrency: [],
  incomeByCurrency: [],
};

export function useEntries(orgId: string, filters?: { tags?: string[] }) {
  const body: Record<string, unknown> = {};
  if (filters?.tags?.length) {
    body.tags = filters.tags;
  }

  const { data, isLoading } = useSWR<ApiEntriesResponse, Error, PostKey>({ url: entriesUrl(orgId), body }, getPostFetcher);

  return {
    entries: data?.entries ?? [],
    count: data?.count ?? 0,
    statement: data?.statement ?? emptyStatement,
    isLoading,
  };
}

export function useEntry(orgId: string, entryId: string) {
  const { data } = useSWR<ApiEntry>(`${entriesUrl(orgId)}/${entryId}`, getFetcher);
  return { entry: data };
}

export function useDeleteEntry(orgId: string) {
  return async (entryId: string) => {
    await del(`${entriesUrl(orgId)}/${entryId}`);
    // entry lists use object keys, statements depend on entries too
    await mutate((key) => {
      const url = typeof key === "string" ? key : (key as PostKey | undefined)?.url;
      return typeof url === "string" && url.startsWith(`/organization/${orgId}/`);
    });
  };
}
