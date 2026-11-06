import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { CashflowChart, CashflowChartSkeleton, type CashflowDatum } from "../components/CashflowChart";
import { CategoryFilter } from "../components/CategoryFilter";
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Segmented, Skeleton, focusRing, td, th } from "../components/ui/primitives";
import { useCategoryBreakdown, useStatement } from "../hooks/useStatement";
import { categoryKey, describeCategories } from "../lib/categories";
import { formatAmount, formatUsd, startOfUtcDayDaysAgo, startOfUtcMonth, utcPeriodsBetween, type Interval } from "../lib/format";

type Period = "month" | "30d" | "90d" | "12m";

const periodOptions: { value: Period; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "12m", label: "12 months" },
];

const intervalOptions: { value: Interval; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

// the bucket size that reads best for each range; the user can still change it
const defaultInterval: Record<Period, Interval> = { month: "day", "30d": "day", "90d": "week", "12m": "month" };

function rangeFor(period: Period, to = new Date()) {
  if (period === "month") return { from: startOfUtcMonth(to), to };
  if (period === "12m") return { from: new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1)), to };
  return { from: startOfUtcDayDaysAgo(period === "30d" ? 29 : 89, to), to };
}

function Metric({
  label,
  description,
  value,
  tone,
  isLoading,
}: {
  label: string;
  description: string;
  value: number;
  tone?: "positive" | "negative";
  isLoading: boolean;
}) {
  return (
    <div className="min-w-0 border-b border-neutral-200 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt>
        <span className="block text-sm font-medium text-neutral-700">{label}</span>
        <span className="mt-0.5 block text-xs text-neutral-500">{description}</span>
      </dt>
      <dd className="mt-2">
        {isLoading ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <span className={`text-2xl font-semibold leading-none tracking-[-0.025em] tabular-nums ${tone === "negative" ? "text-red-700" : "text-neutral-950"}`}>
            {formatUsd(value)}
          </span>
        )}
      </dd>
    </div>
  );
}

function Home() {
  const { orgId = "" } = useParams();
  const [period, setPeriod] = useState<Period>("month");
  const [interval, setChartInterval] = useState<Interval>(defaultInterval.month);
  // categories switched off in the chart; new categories show up switched on
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  // computed once per period so the SWR keys stay stable between renders
  const range = useMemo(() => rangeFor(period), [period]);

  const statement = useStatement(orgId, range.from, range.to);
  const breakdown = useCategoryBreakdown(orgId, range.from, range.to, interval);
  const net = statement.income - statement.expenses;

  const { categories, series } = useMemo(() => describeCategories(breakdown.rows), [breakdown.rows]);

  // one bar per bucket of the range, including empty ones, with hidden categories left out
  const chart = useMemo(() => {
    const seriesOf = new Map(categories.map((c) => [c.key, c.series]));
    const buckets = new Map<string, CashflowDatum>(
      utcPeriodsBetween(range.from, range.to, breakdown.interval).map((p) => [p, { period: p, income: {}, expenses: {} }]),
    );
    let income = 0;
    let expenses = 0;
    for (const r of breakdown.rows) {
      const key = categoryKey(r.category);
      const bucket = buckets.get(r.period);
      if (!bucket || hidden.has(key)) continue;
      const side = r.type === "income" ? bucket.income : bucket.expenses;
      const s = seriesOf.get(key)!;
      side[s] = (side[s] ?? 0) + r.sumUsd;
      if (r.type === "income") income += r.sumUsd;
      else expenses += r.sumUsd;
    }
    const visibleSeries = series.filter((s) => [...buckets.values()].some((b) => b.income[s.key] || b.expenses[s.key]));
    return { data: [...buckets.values()], series: visibleSeries, income, expenses };
  }, [breakdown.rows, breakdown.interval, categories, series, hidden, range]);

  const changePeriod = (next: Period) => {
    setPeriod(next);
    setChartInterval(defaultInterval[next]);
  };

  // merge income and expense breakdowns into one row per currency
  const currencies = useMemo(() => {
    const rows = new Map<string, { currency: string; income: number; incomeUsd: number; expenses: number; expensesUsd: number }>();
    const row = (currency: string) => {
      let r = rows.get(currency);
      if (!r) rows.set(currency, (r = { currency, income: 0, incomeUsd: 0, expenses: 0, expensesUsd: 0 }));
      return r;
    };
    for (const c of statement.incomeByCurrency) Object.assign(row(c.currency), { income: c.sum, incomeUsd: c.sumUsd });
    for (const c of statement.expensesByCurrency) Object.assign(row(c.currency), { expenses: c.sum, expensesUsd: c.sumUsd });
    return [...rows.values()].sort((a, b) => b.incomeUsd + b.expensesUsd - (a.incomeUsd + a.expensesUsd));
  }, [statement.incomeByCurrency, statement.expensesByCurrency]);

  const hasActivity = statement.income > 0 || statement.expenses > 0;

  return (
    <section aria-labelledby="overview-title">
      <PageHeader
        id="overview-title"
        title="Overview"
        description="Income and expenses valued in USD at the time each entry was recorded."
        actions={<Segmented label="Period" value={period} options={periodOptions} onChange={changePeriod} />}
      />

      <dl className="mt-6 grid overflow-hidden rounded-lg border border-neutral-200 bg-white sm:grid-cols-3" aria-label="Totals for the period">
        <Metric label="Income" description="Money in" value={statement.income} isLoading={statement.isLoading} />
        <Metric label="Expenses" description="Money out" value={statement.expenses} isLoading={statement.isLoading} />
        <Metric label="Net" description="Income minus expenses" value={net} tone={net < 0 ? "negative" : "positive"} isLoading={statement.isLoading} />
      </dl>

      <Card className="mt-4" aria-labelledby="cashflow-title">
        <CardHeader
          title={<span id="cashflow-title">Cash flow by category</span>}
          description={
            chart.series.length ? (
              <span className="tabular-nums">
                {formatUsd(chart.income)} in · {formatUsd(chart.expenses)} out
                {hidden.size ? " for the selected categories" : ""}, grouped by UTC {interval}
              </span>
            ) : (
              `Income above the line, expenses below, grouped by UTC ${interval}`
            )
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <CategoryFilter categories={categories} hidden={hidden} onChange={setHidden} />
              <Segmented label="Group by" value={interval} options={intervalOptions} onChange={setChartInterval} />
            </div>
          }
        />
        {chart.series.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-1 text-xs text-neutral-600" aria-label="Legend">
            {chart.series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        ) : null}
        {breakdown.error ? (
          <ErrorState title={`Couldn't load the chart: ${breakdown.error.message}`} />
        ) : breakdown.isLoading ? (
          <CashflowChartSkeleton />
        ) : chart.series.length === 0 ? (
          hidden.size && breakdown.rows.length ? (
            <EmptyState
              title="All categories are switched off"
              action={
                <button
                  type="button"
                  onClick={() => setHidden(new Set())}
                  className={`rounded text-[13px] font-medium text-[#1968ad] hover:underline ${focusRing}`}
                >
                  Show all categories
                </button>
              }
            >
              Pick categories to chart from the menu above.
            </EmptyState>
          ) : (
            <EmptyState title="No activity in this period">Entries you record show up here, grouped by category.</EmptyState>
          )
        ) : (
          <CashflowChart data={chart.data} series={chart.series} interval={breakdown.interval} />
        )}
      </Card>

      <Card className="mt-4" aria-labelledby="currencies-title">
        <CardHeader title={<span id="currencies-title">By currency</span>} description="Amounts in the original currency, with their USD value" />
        {statement.isLoading ? (
          <div className="space-y-3 px-4 pb-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !hasActivity ? (
          <EmptyState
            title="No activity in this period"
            action={
              <Link to={`/o/${orgId}/docs`} className={`rounded text-[13px] font-medium text-[#1968ad] hover:underline ${focusRing}`}>
                Learn how to record entries →
              </Link>
            }
          >
            Entries you send to the API show up here.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto border-t border-neutral-200">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead className="bg-neutral-50/50 text-neutral-500">
                <tr className="border-b border-neutral-200">
                  <th className={th} scope="col">
                    Currency
                  </th>
                  <th className={`${th} text-right`} scope="col">
                    Income
                  </th>
                  <th className={`${th} text-right`} scope="col">
                    Income (USD)
                  </th>
                  <th className={`${th} text-right`} scope="col">
                    Expenses
                  </th>
                  <th className={`${th} text-right`} scope="col">
                    Expenses (USD)
                  </th>
                  <th className={`${th} text-right`} scope="col">
                    Net (USD)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 tabular-nums text-neutral-700">
                {currencies.map((c) => (
                  <tr className="h-10 hover:bg-neutral-50" key={c.currency}>
                    <td className={td}>
                      <span className="inline-flex items-center gap-2 font-medium text-neutral-900">
                        <span className="grid size-5 place-items-center rounded bg-neutral-100 text-[9px] font-semibold uppercase text-neutral-600">
                          {c.currency.slice(0, 3)}
                        </span>
                        {c.currency.toUpperCase()}
                      </span>
                    </td>
                    <td className={`${td} text-right`}>{c.income ? formatAmount(c.income) : <span className="text-neutral-400">—</span>}</td>
                    <td className={`${td} text-right`}>{c.incomeUsd ? formatUsd(c.incomeUsd) : <span className="text-neutral-400">—</span>}</td>
                    <td className={`${td} text-right`}>{c.expenses ? formatAmount(c.expenses) : <span className="text-neutral-400">—</span>}</td>
                    <td className={`${td} text-right`}>{c.expensesUsd ? formatUsd(c.expensesUsd) : <span className="text-neutral-400">—</span>}</td>
                    <td className={`${td} text-right font-medium ${c.incomeUsd - c.expensesUsd < 0 ? "text-red-700" : "text-neutral-950"}`}>
                      {formatUsd(c.incomeUsd - c.expensesUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-neutral-200 bg-neutral-50/50 tabular-nums">
                <tr className="h-10 font-medium text-neutral-900">
                  <td className={td}>Total</td>
                  <td className={td} />
                  <td className={`${td} text-right`}>{formatUsd(statement.income)}</td>
                  <td className={td} />
                  <td className={`${td} text-right`}>{formatUsd(statement.expenses)}</td>
                  <td className={`${td} text-right ${net < 0 ? "text-red-700" : ""}`}>{formatUsd(net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

export default Home;
