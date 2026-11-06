import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import EntryDrawer from "../components/EntryDrawer";
import { EntryTypePill } from "../components/EntryTypePill";
import { CloseIcon, SearchIcon } from "../components/ui/icons";
import { Card, CopyableText, EmptyState, PageHeader, Tag, Toolbar, focusRing, td, th } from "../components/ui/primitives";
import { useEntries } from "../hooks/useEntries";
import { formatAmount, formatCount, formatDateTime, formatRelative, formatUsd } from "../lib/format";

const COLUMNS = 7;

function Entries() {
  const { orgId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEntryId = searchParams.get("entryId");
  const tags = searchParams.get("tags")?.split(",").filter(Boolean) ?? [];
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState<string>();
  const { entries, count, statement, isLoading } = useEntries(orgId, { tags });

  // filters live in the URL so a filtered view can be shared or reloaded
  const updateParams = (update: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams);
    update(params);
    setSearchParams(params);
  };

  const setTags = (next: string[]) =>
    updateParams((p) => {
      if (next.length) p.set("tags", next.join(","));
      else p.delete("tags");
    });

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) setTags([...tags, tag]);
  };

  const handleTagSubmit = (e: FormEvent) => {
    e.preventDefault();
    const tag = tagInput.trim();
    if (!tag) return;
    if (!/^[^:\s]+:[^:\s]+$/.test(tag)) {
      setTagError("Use the key:value format, e.g. client:acme");
      return;
    }
    setTagError(undefined);
    addTag(tag);
    setTagInput("");
  };

  const net = statement.income - statement.expenses;

  return (
    <section aria-labelledby="entries-title">
      <PageHeader
        id="entries-title"
        title="Entries"
        count={isLoading ? "…" : formatCount(count)}
        description="Every income and expense recorded through the API, newest first."
      />

      <Card className="mt-6">
        <Toolbar>
          <form onSubmit={handleTagSubmit} className="relative min-w-52 flex-1 sm:max-w-xs">
            <label className="sr-only" htmlFor="tag-filter">
              Filter by tag
            </label>
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
            <input
              id="tag-filter"
              className="h-8 w-full rounded-md border border-neutral-300 bg-white pl-8 pr-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-500 hover:border-neutral-400 focus:border-fuchsia-600 focus:ring-2 focus:ring-fuchsia-100 aria-invalid:border-red-500"
              placeholder="Filter by tag, e.g. client:acme"
              value={tagInput}
              aria-invalid={tagError ? true : undefined}
              aria-describedby={tagError ? "tag-filter-error" : undefined}
              onChange={(e) => {
                setTagInput(e.target.value);
                setTagError(undefined);
              }}
              autoComplete="off"
            />
          </form>

          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-fuchsia-200 bg-fuchsia-50 pl-2 pr-1 font-mono text-[11px] text-fuchsia-900"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag} filter`}
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="grid size-5 place-items-center rounded text-fuchsia-700 outline-none hover:bg-fuchsia-100 focus-visible:ring-2 focus-visible:ring-fuchsia-600"
              >
                <CloseIcon className="size-3" />
              </button>
            </span>
          ))}
          {tags.length > 1 ? (
            <button
              type="button"
              onClick={() => setTags([])}
              className={`rounded px-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 ${focusRing}`}
            >
              Clear all
            </button>
          ) : null}
          {tagError ? (
            <p id="tag-filter-error" className="text-xs text-red-700" role="alert">
              {tagError}
            </p>
          ) : null}

          <dl className="ml-auto flex items-center gap-4 px-1 text-xs tabular-nums" aria-label="Totals for the filtered entries">
            <div className="flex gap-1.5">
              <dt className="text-neutral-500">Income</dt>
              <dd className="font-medium text-neutral-900">{formatUsd(statement.income)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-neutral-500">Expenses</dt>
              <dd className="font-medium text-neutral-900">{formatUsd(statement.expenses)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-neutral-500">Net</dt>
              <dd className={`font-semibold ${net < 0 ? "text-red-700" : "text-neutral-950"}`}>{formatUsd(net)}</dd>
            </div>
          </dl>
        </Toolbar>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-xs" aria-busy={isLoading}>
            <caption className="sr-only">Entries</caption>
            <thead className="bg-neutral-50/50 text-neutral-500">
              <tr className="border-b border-neutral-200">
                <th className={`${th} w-[13%]`} scope="col">
                  Date
                </th>
                <th className={`${th} w-[10%]`} scope="col">
                  Type
                </th>
                <th className={`${th} w-[12%]`} scope="col">
                  Category
                </th>
                <th className={`${th} w-[15%] text-right`} scope="col">
                  Amount
                </th>
                <th className={`${th} w-[14%] text-right`} scope="col">
                  Value (USD)
                </th>
                <th className={th} scope="col">
                  Tags
                </th>
                <th className={`${th} w-[14%]`} scope="col">
                  Entry ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {isLoading
                ? Array.from({ length: 6 }, (_, row) => (
                    <tr className="h-10" key={row}>
                      {Array.from({ length: COLUMNS }, (__, col) => (
                        <td className={td} key={col}>
                          <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none" aria-hidden="true" />
                        </td>
                      ))}
                    </tr>
                  ))
                : null}

              {!isLoading && entries.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS}>
                    {tags.length ? (
                      <EmptyState title="No entries match these filters">Try removing a tag filter.</EmptyState>
                    ) : (
                      <EmptyState
                        title="No entries yet"
                        action={
                          <Link to={`/o/${orgId}/docs`} className={`rounded text-[13px] font-medium text-[#1968ad] hover:underline ${focusRing}`}>
                            Send your first entry →
                          </Link>
                        }
                      >
                        Record income and expenses with an API key.
                      </EmptyState>
                    )}
                  </td>
                </tr>
              ) : null}

              {!isLoading
                ? entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`h-10 cursor-pointer text-neutral-700 hover:bg-neutral-50 ${selectedEntryId === entry.id ? "bg-neutral-50" : ""}`}
                      onClick={() => updateParams((p) => p.set("entryId", entry.id))}
                    >
                      <td className={td} title={formatDateTime(entry.dateOfEntry)}>
                        <span className="text-neutral-900">{formatRelative(entry.dateOfEntry)}</span>
                      </td>
                      <td className={td}>
                        <EntryTypePill type={entry.type} />
                      </td>
                      <td className={`${td} max-w-40 truncate`} title={entry.category ?? undefined}>
                        {entry.category ? <span className="text-neutral-900">{entry.category}</span> : <span className="text-neutral-400">—</span>}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        <span className="text-neutral-900">{formatAmount(entry.amount)}</span>{" "}
                        <span className="uppercase text-neutral-500">{entry.currency}</span>
                      </td>
                      <td className={`${td} text-right font-medium tabular-nums text-neutral-900`}>{formatUsd(entry.valueAtDate)}</td>
                      <td className={td}>
                        <div className="flex flex-wrap gap-1">
                          {entry.tags.length ? (
                            entry.tags.map((tag) => (
                              <Tag
                                key={tag}
                                active={tags.includes(tag)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addTag(tag);
                                }}
                              >
                                {tag}
                              </Tag>
                            ))
                          ) : (
                            <span className="text-neutral-400">No tags</span>
                          )}
                        </div>
                      </td>
                      <td className={`${td} max-w-40`}>
                        <CopyableText value={entry.id} label="entry id" className="text-[11px] text-neutral-500" />
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>

        {!isLoading && entries.length > 0 ? (
          <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50/50 px-3 py-2">
            <p className="text-xs tabular-nums text-neutral-500">
              {entries.length < count
                ? `Showing the latest ${formatCount(entries.length)} of ${formatCount(count)} entries`
                : `${formatCount(count)} ${count === 1 ? "entry" : "entries"}`}
            </p>
          </div>
        ) : null}
      </Card>

      {selectedEntryId ? (
        <EntryDrawer orgId={orgId} entryId={selectedEntryId} onClose={() => updateParams((p) => p.delete("entryId"))} onTagClick={addTag} />
      ) : null}
    </section>
  );
}

export default Entries;
