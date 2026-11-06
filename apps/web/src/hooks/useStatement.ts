import type { BreakdownInterval, CategoryBreakdown, Statement } from "@accounting/shared";
import useSWR from "swr";
import { getPostFetcher, type PostKey } from "../api/api";

export function useStatement(orgId: string, from: Date, to: Date) {
  const { data, isLoading } = useSWR<Statement, Error, PostKey>(
    { url: `/organization/${orgId}/statement`, body: { from: from.toISOString(), to: to.toISOString() } },
    getPostFetcher,
  );

  return {
    income: data?.income ?? 0,
    expenses: data?.expenses ?? 0,
    incomeByCurrency: data?.incomeByCurrency ?? [],
    expensesByCurrency: data?.expensesByCurrency ?? [],
    isLoading,
  };
}

export function useCategoryBreakdown(orgId: string, from: Date, to: Date, interval: BreakdownInterval) {
  const { data, isLoading, error } = useSWR<CategoryBreakdown, Error, PostKey>(
    { url: `/organization/${orgId}/statement/categories`, body: { from: from.toISOString(), to: to.toISOString(), interval } },
    getPostFetcher,
    // keep the previous chart on screen while a new interval loads
    { keepPreviousData: true },
  );

  return { rows: data?.rows ?? [], interval: data?.interval ?? interval, isLoading: isLoading && !data, error };
}
