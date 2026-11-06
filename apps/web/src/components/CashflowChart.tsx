import { useLayoutEffect, useRef, useState } from "react";
import type { Series } from "../lib/categories";
import { formatPeriod, formatPeriodShort, formatUsd, formatUsdCompact, type Interval } from "../lib/format";

// one bucket of the chart: USD per series, income stacked up and expenses stacked down
export type CashflowDatum = { period: string; income: Record<string, number>; expenses: Record<string, number> };

const HEIGHT = 280;
const LEFT = 56;
const RIGHT = 12;
const TOP = 12;
const BOTTOM = 30;
const TARGET_TICKS = 5;
const MAX_X_LABELS = 8;
// surface gap between stacked segments
const SEGMENT_GAP = 2;

// rounds a tick step up to 1, 2, 2.5 or 5 × 10^n so axis labels read cleanly
function niceStep(raw: number) {
  if (raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

const sum = (values: Record<string, number>) => Object.values(values).reduce((a, b) => a + b, 0);

// rect with only the two corners away from the baseline rounded
function segmentPath(x: number, y: number, w: number, h: number, roundTop: boolean, radius: number) {
  const r = Math.min(radius, w / 2, h);
  if (r <= 0) return `M${x},${y}h${w}v${h}h${-w}Z`;
  return roundTop
    ? `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
    : `M${x},${y}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w - r}Q${x + w},${y + h} ${x + w},${y + h - r}V${y}Z`;
}

export function CashflowChartSkeleton() {
  return (
    <div className="h-[280px] animate-pulse px-4 pb-4 motion-reduce:animate-none" aria-label="Loading cash flow" role="status">
      <div className="flex h-full items-end gap-2 border-b border-neutral-200 pb-6">
        {Array.from({ length: 24 }, (_, i) => (
          <div className="flex-1 rounded-t-sm bg-neutral-100" key={i} style={{ height: `${18 + ((i * 23) % 60)}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Income above the zero line and expenses below it, each stacked by category, in USD. */
export function CashflowChart({ data, series, interval }: { data: CashflowDatum[]; series: Series[]; interval: Interval }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [width, setWidth] = useState(900);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // keep SVG units aligned with CSS pixels so labels stay crisp as the panel resizes
    const update = () => setWidth(Math.max(320, Math.round(container.clientWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const plotWidth = width - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const maxIncome = Math.max(0, ...data.map((d) => sum(d.income)));
  const maxExpenses = Math.max(0, ...data.map((d) => sum(d.expenses)));
  const step = niceStep(Math.max(1, maxIncome + maxExpenses) / TARGET_TICKS);
  // an empty side still gets one tick, so the zero line never sits on the edge
  const top = Math.max(step, Math.ceil(maxIncome / step) * step);
  const bottom = maxExpenses > 0 ? Math.ceil(maxExpenses / step) * step : 0;
  const y = (value: number) => TOP + ((top - value) / (top + bottom)) * plotHeight;
  const zero = y(0);
  const ticks: number[] = [];
  for (let v = -bottom; v <= top + step / 2; v += step) ticks.push(v);

  const slot = plotWidth / Math.max(1, data.length);
  const barWidth = Math.max(2, Math.min(32, slot * 0.62));
  const labelEvery = Math.max(1, Math.ceil(data.length / MAX_X_LABELS));
  const active = activeIndex === null ? undefined : data[activeIndex];
  const activeX = activeIndex === null ? 0 : LEFT + (activeIndex + 0.5) * slot;
  const label = `Income and expenses per ${interval} by category, in USD`;

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * width;
    const index = Math.floor((x - LEFT) / slot);
    setActiveIndex(Math.max(0, Math.min(data.length - 1, index)));
  }

  // stacked segments for one side of one bar, outermost segment rounded
  function stack(values: Record<string, number>, direction: 1 | -1, x: number, dim: boolean) {
    const parts = series.filter((s) => (values[s.key] ?? 0) > 0);
    let offset = 0;
    return parts.map((s, i) => {
      const value = values[s.key]!;
      const start = y(direction * offset);
      const end = y(direction * (offset + value));
      offset += value;
      const outer = i === parts.length - 1;
      // leave a surface gap between segments, but never let a segment vanish
      const gap = i === 0 ? 0 : SEGMENT_GAP;
      const y0 = direction === 1 ? end : start + gap;
      const h = Math.max(1, Math.abs(end - start) - gap);
      return (
        <path
          key={s.key}
          d={outer ? segmentPath(x, direction === 1 ? y0 : start + gap, barWidth, h, direction === 1, 4) : `M${x},${y0}h${barWidth}v${h}h${-barWidth}Z`}
          fill={s.color}
          opacity={dim ? 0.45 : 1}
        />
      );
    });
  }

  return (
    <div className="relative px-2 pb-2 sm:px-4" ref={containerRef}>
      <svg
        className="block h-[280px] w-full cursor-crosshair select-none"
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={label}
        onPointerLeave={() => setActiveIndex(null)}
        onPointerMove={handlePointerMove}
      >
        {ticks.map((value) => (
          <g key={value}>
            <line
              className={value === 0 ? "stroke-neutral-400" : "stroke-neutral-200"}
              strokeDasharray={value === 0 ? undefined : "2 3"}
              x1={LEFT}
              x2={width - RIGHT}
              y1={y(value)}
              y2={y(value)}
            />
            <text className="fill-neutral-500 text-[11px] tabular-nums" dominantBaseline="middle" textAnchor="end" x={LEFT - 10} y={y(value)}>
              {formatUsdCompact(value)}
            </text>
          </g>
        ))}

        {active ? <rect className="fill-neutral-100" x={LEFT + activeIndex! * slot} y={TOP} width={slot} height={plotHeight} /> : null}

        {data.map((d, i) => {
          const center = LEFT + (i + 0.5) * slot;
          const x = center - barWidth / 2;
          const dim = activeIndex !== null && activeIndex !== i;
          return (
            <g key={d.period}>
              {stack(d.income, 1, x, dim)}
              {stack(d.expenses, -1, x, dim)}
              {i % labelEvery === 0 ? (
                <text className="fill-neutral-500 text-[11px]" textAnchor="middle" x={center} y={HEIGHT - 8}>
                  {formatPeriodShort(d.period, interval)}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* zero line on top of the bars */}
        <line className="stroke-neutral-500" x1={LEFT} x2={width - RIGHT} y1={zero} y2={zero} />
        <text className="fill-neutral-400 text-[10px] font-medium uppercase tracking-wide" x={LEFT + 6} y={TOP + 10}>
          Income
        </text>
        {bottom > 0 ? (
          <text className="fill-neutral-400 text-[10px] font-medium uppercase tracking-wide" x={LEFT + 6} y={TOP + plotHeight - 4}>
            Expenses
          </text>
        ) : null}
      </svg>

      {active ? <Tooltip datum={active} series={series} interval={interval} x={activeX / width} /> : null}

      {/* exact values for assistive tech, without exposing SVG internals */}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{interval}</th>
            <th scope="col">Category</th>
            <th scope="col">Income</th>
            <th scope="col">Expenses</th>
          </tr>
        </thead>
        <tbody>
          {data.flatMap((d) =>
            series
              .filter((s) => d.income[s.key] || d.expenses[s.key])
              .map((s) => (
                <tr key={`${d.period}-${s.key}`}>
                  <th scope="row">{formatPeriod(d.period, interval)}</th>
                  <td>{s.label}</td>
                  <td>{formatUsd(d.income[s.key] ?? 0)}</td>
                  <td>{formatUsd(d.expenses[s.key] ?? 0)}</td>
                </tr>
              )),
          )}
        </tbody>
      </table>
    </div>
  );
}

function Tooltip({ datum, series, interval, x }: { datum: CashflowDatum; series: Series[]; interval: Interval; x: number }) {
  const income = sum(datum.income);
  const expenses = sum(datum.expenses);
  const rows = series.filter((s) => datum.income[s.key] || datum.expenses[s.key]);

  return (
    <div
      className="pointer-events-none absolute top-2 z-10 w-72 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
      style={{ left: `clamp(0px, calc(${x * 100}% - 9rem), calc(100% - 18rem))` }}
    >
      <p className="font-medium text-neutral-900">{formatPeriod(datum.period, interval)}</p>
      {rows.length === 0 ? (
        <p className="mt-1 text-neutral-500">No entries</p>
      ) : (
        <table className="mt-1.5 w-full tabular-nums">
          <thead className="text-[10px] uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="pb-0.5 text-left font-medium">Category</th>
              <th className="pb-0.5 text-right font-medium">In</th>
              <th className="pb-0.5 text-right font-medium">Out</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.key}>
                <td className="max-w-0 py-0.5 pr-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-neutral-700">
                    <span className="size-2 shrink-0 rounded-sm" style={{ background: s.color }} />
                    <span className="truncate">{s.label}</span>
                  </span>
                </td>
                <td className="py-0.5 text-right text-neutral-900">
                  {datum.income[s.key] ? formatUsdCompact(datum.income[s.key]!) : <span className="text-neutral-300">—</span>}
                </td>
                <td className="py-0.5 pl-2 text-right text-neutral-900">
                  {datum.expenses[s.key] ? formatUsdCompact(datum.expenses[s.key]!) : <span className="text-neutral-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <dl className="mt-1.5 space-y-0.5 border-t border-neutral-100 pt-1.5 tabular-nums">
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-600">Income</dt>
          <dd className="text-neutral-900">{formatUsd(income)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-600">Expenses</dt>
          <dd className="text-neutral-900">{formatUsd(expenses)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-600">Net</dt>
          <dd className={`font-medium ${income - expenses < 0 ? "text-red-700" : "text-neutral-950"}`}>{formatUsd(income - expenses)}</dd>
        </div>
      </dl>
    </div>
  );
}
