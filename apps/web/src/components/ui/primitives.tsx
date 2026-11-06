import { useState, type InputHTMLAttributes, type ReactNode } from "react";

export const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-600 focus-visible:ring-offset-2";

/** Page title row: title, optional count pill, description and trailing actions. */
export function PageHeader({
  id,
  title,
  count,
  description,
  actions,
}: {
  id: string;
  title: ReactNode;
  count?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold leading-tight tracking-[-0.025em] text-neutral-950" id={id}>
            {title}
          </h1>
          {count !== undefined ? (
            <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-neutral-600">
              {count}
            </span>
          ) : null}
        </div>
        {description ? <p className="mt-2 max-w-[70ch] text-sm leading-6 text-neutral-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Section title row with an optional trailing action. */
export function SectionHeading({ id, title, description, action }: { id?: string; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-neutral-200 pb-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-neutral-950" id={id}>
          {title}
        </h2>
        {description ? <p className="mt-0.5 max-w-[70ch] text-[13px] leading-5 text-neutral-600">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
    </div>
  );
}

export function Card({ children, className = "", ...props }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section {...props} className={`overflow-hidden rounded-lg border border-neutral-200 bg-white ${className}`}>
      {children}
    </section>
  );
}

/** Header strip inside a card. */
export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-2 pt-3">
      <div>
        <h2 className="text-sm font-medium text-neutral-800">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-neutral-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Filter / toolbar strip on top of a table card. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-neutral-200 bg-neutral-50/70 p-2">{children}</div>;
}

/** One label/value pair in a dense definition list. */
export function DetailRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-neutral-100 py-2.5 text-sm last:border-b-0">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className="min-w-0 text-right text-neutral-900">{value}</dd>
    </div>
  );
}

const pillTones = {
  success: "bg-emerald-50 text-emerald-700",
  danger: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-800",
  info: "bg-violet-50 text-violet-700",
  neutral: "bg-neutral-100 text-neutral-600",
} as const;

export type PillTone = keyof typeof pillTones;

export function Pill({ tone = "neutral", children, className = "" }: { tone?: PillTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${pillTones[tone]} ${className}`}>{children}</span>
  );
}

/** Small square pill used for tags. */
export function Tag({ children, onClick, active = false }: { children: ReactNode; onClick?: (e: React.MouseEvent) => void; active?: boolean }) {
  const base = `inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] ${active ? "bg-fuchsia-50 text-fuchsia-800" : "bg-neutral-100 text-neutral-700"}`;
  if (!onClick) return <span className={base}>{children}</span>;
  return (
    <button type="button" onClick={onClick} className={`${base} ${focusRing} hover:bg-neutral-200`}>
      {children}
    </button>
  );
}

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid place-items-center px-4 py-14 text-center">
      <div className="max-w-sm">
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        {children ? <p className="mt-1 text-[13px] leading-5 text-neutral-500">{children}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

export function ErrorState({ title, onRetry }: { title: ReactNode; onRetry?: () => void }) {
  return (
    <div className="grid place-items-center px-4 py-10 text-center">
      <div>
        <p className="text-sm font-medium text-red-700">{title}</p>
        {onRetry ? (
          <button className={`mt-1 rounded text-xs font-semibold text-fuchsia-800 hover:text-fuchsia-950 ${focusRing}`} type="button" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-neutral-100 motion-reduce:animate-none ${className}`} aria-hidden="true" />;
}

export async function writeToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

/** Monospace value with a copy-on-click affordance, for ids and api keys. */
export function CopyableText({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`group/copy inline-flex min-w-0 max-w-full items-center gap-1.5 rounded font-mono text-[12px] text-neutral-800 hover:text-neutral-950 ${focusRing} ${className}`}
      title={`Copy ${label}`}
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        if (await writeToClipboard(value)) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }
      }}
    >
      <span className="truncate">{copied ? "Copied" : value}</span>
      <svg
        aria-hidden="true"
        className="size-3.5 shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover/copy:opacity-100 group-focus-visible/copy:opacity-100"
        fill="none"
        viewBox="0 0 16 16"
      >
        <rect height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" width="9" x="5" y="5" />
        <path d="M11 3.5V3a1.5 1.5 0 0 0-1.5-1.5h-6A1.5 1.5 0 0 0 2 3v6a1.5 1.5 0 0 0 1.5 1.5H4" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    </button>
  );
}

export const inputClass =
  "h-9 w-full rounded-md border border-neutral-300 bg-white px-2.5 text-sm text-neutral-900 outline-none transition-colors duration-150 placeholder:text-neutral-400 hover:border-neutral-400 focus:border-fuchsia-600 focus:ring-2 focus:ring-fuchsia-100 aria-invalid:border-red-500 motion-reduce:transition-none";

/** Labelled input. */
export function Field({ label, hint, id, ...props }: { label: ReactNode; hint?: ReactNode; id: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-neutral-800" htmlFor={id}>
        {label}
      </label>
      <input id={id} className={inputClass} {...props} />
      {hint ? <p className="mt-1.5 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

/** Feedback line under a form, e.g. an error from the API. */
export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
      {children}
    </p>
  );
}

/** Segmented control (period pickers, filters). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      className="inline-flex rounded-md border border-neutral-300 bg-white p-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
      role="radiogroup"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-7 rounded px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-fuchsia-600 ${
            value === o.value ? "bg-neutral-100 text-neutral-950" : "text-neutral-600 hover:text-neutral-950"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Table cell classes shared by every dense table. */
export const th = "h-8 border-r border-neutral-200 px-3 text-left font-medium last:border-r-0";
export const td = "border-r border-neutral-100 px-3 last:border-r-0";
