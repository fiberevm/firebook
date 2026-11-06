import { useEffect, useState } from "react";
import { EntryTypePill } from "./EntryTypePill";
import { useDeleteEntry, useEntry } from "../hooks/useEntries";
import { formatAmount, formatDateTime, formatUsd } from "../lib/format";
import { Button } from "./ui/Button";
import { CloseIcon } from "./ui/icons";
import { CopyableText, DetailRow, FormError, SectionHeading, Skeleton, Tag } from "./ui/primitives";

interface EntryDrawerProps {
  orgId: string;
  entryId: string;
  onClose: () => void;
  onTagClick: (tag: string) => void;
}

/** Side panel with the details of one entry. */
function EntryDrawer({ orgId, entryId, onClose, onTagClick }: EntryDrawerProps) {
  const { entry } = useEntry(orgId, entryId);
  const deleteEntry = useDeleteEntry(orgId);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleDelete = async () => {
    if (!entry || !window.confirm("Delete this entry? It will no longer count towards your statements.")) return;
    setIsDeleting(true);
    try {
      await deleteEntry(entry.id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setIsDeleting(false);
    }
  };

  const metadata = Object.entries(entry?.metadata ?? {});

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-neutral-950/20" type="button" onClick={onClose} aria-hidden="true" tabIndex={-1} />
      <aside
        className="absolute inset-y-0 right-0 flex w-[min(30rem,100vw)] flex-col border-l border-neutral-200 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.16)]"
        aria-label="Entry details"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 px-4">
          <p className="text-sm font-medium text-neutral-500">Entry</p>
          <button
            className="grid size-8 place-items-center rounded-md text-neutral-500 outline-none hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-fuchsia-600"
            type="button"
            onClick={onClose}
            aria-label="Close entry details"
            autoFocus
          >
            <CloseIcon className="size-4" />
          </button>
        </header>

        {!entry ? (
          <div className="space-y-3 p-5" role="status" aria-label="Loading entry">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="mt-6 h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center gap-2">
              <EntryTypePill type={entry.type} />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] tabular-nums text-neutral-950">{formatUsd(entry.valueAtDate)}</p>
            <p className="mt-1 text-sm tabular-nums text-neutral-600">
              {formatAmount(entry.amount)} <span className="uppercase">{entry.currency}</span> · {formatDateTime(entry.dateOfEntry)}
            </p>

            <div className="mt-8">
              <SectionHeading title="Details" />
              <dl>
                <DetailRow label="Entry ID" value={<CopyableText value={entry.id} label="entry id" />} />
                <DetailRow label="Date of entry" value={formatDateTime(entry.dateOfEntry)} />
                <DetailRow
                  label="Amount"
                  value={
                    <span className="tabular-nums">
                      {formatAmount(entry.amount)} {entry.currency.toUpperCase()}
                    </span>
                  }
                />
                <DetailRow label="Category" value={entry.category ?? <span className="text-neutral-400">Uncategorized</span>} />
                <DetailRow label="USD value at date" value={<span className="tabular-nums">{formatUsd(entry.valueAtDate)}</span>} />
                <DetailRow label="Recorded" value={formatDateTime(entry.createdAt)} />
                <DetailRow
                  label="Tags"
                  value={
                    entry.tags.length ? (
                      <span className="flex flex-wrap justify-end gap-1">
                        {entry.tags.map((tag) => (
                          <Tag key={tag} onClick={() => onTagClick(tag)}>
                            {tag}
                          </Tag>
                        ))}
                      </span>
                    ) : (
                      <span className="text-neutral-400">None</span>
                    )
                  }
                />
              </dl>
            </div>

            <div className="mt-8">
              <SectionHeading title="Metadata" description="Key-value pairs attached when the entry was created." />
              {metadata.length ? (
                <dl>
                  {metadata.map(([key, value]) => (
                    <DetailRow
                      key={key}
                      label={<span className="font-mono text-[12px]">{key}</span>}
                      value={<span className="font-mono text-[12px]">{String(value)}</span>}
                    />
                  ))}
                </dl>
              ) : (
                <p className="py-4 text-sm text-neutral-500">No metadata.</p>
              )}
            </div>
          </div>
        )}

        {entry ? (
          <footer className="shrink-0 space-y-2 border-t border-neutral-200 bg-neutral-50/50 px-4 py-3">
            <FormError>{error}</FormError>
            <div className="flex justify-end">
              <Button variant="danger" size="sm" onClick={handleDelete} isLoading={isDeleting} loadingLabel="Deleting…">
                Delete entry
              </Button>
            </div>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

export default EntryDrawer;
