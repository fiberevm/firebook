import type { ApiKey } from "@accounting/shared";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { PlusIcon } from "../components/ui/icons";
import { Card, CopyableText, EmptyState, Field, FormError, PageHeader, Pill, focusRing, td, th } from "../components/ui/primitives";
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "../hooks/useApiKeys";
import { formatDate, formatRelative } from "../lib/format";

// "firebooks_abcd…wxyz": enough to recognise a key without showing all of it
const maskKey = (key: string) => (key.length > 18 ? `${key.slice(0, 14)}…${key.slice(-4)}` : key);

function CreateKeyModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const close = () => {
    setName("");
    setError(undefined);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(undefined);
    try {
      await onCreate(name.trim());
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Create API key" description="Keys can create entries for this organization. Treat them like passwords.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError>{error}</FormError>
        <Field
          id="key-name"
          label="Name"
          placeholder="e.g. Production billing"
          hint="Only used to tell your keys apart."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} loadingLabel="Creating…" disabled={!name.trim()}>
            Create key
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ApiKeys() {
  const { orgId = "" } = useParams();
  const { apiKeys } = useApiKeys(orgId);
  const createKey = useCreateApiKey(orgId);
  const deleteKey = useDeleteApiKey(orgId);
  const [isCreating, setIsCreating] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const revoke = async (key: ApiKey) => {
    if (!window.confirm(`Revoke "${key.name}"? Requests using this key will start failing immediately.`)) return;
    await deleteKey(key.id);
  };

  const isLoading = apiKeys === undefined;

  return (
    <section aria-labelledby="keys-title">
      <PageHeader
        id="keys-title"
        title="API keys"
        count={isLoading ? "…" : apiKeys.length}
        description={
          <>
            Use a key in the <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[12px] text-neutral-800">Authorization</code> header to record
            entries.{" "}
            <Link to={`/o/${orgId}/docs`} className={`rounded font-medium text-[#1968ad] hover:underline ${focusRing}`}>
              Read the docs
            </Link>
          </>
        }
        actions={
          <Button onClick={() => setIsCreating(true)}>
            <PlusIcon className="size-4" /> Create key
          </Button>
        }
      />

      <Card className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <caption className="sr-only">API keys</caption>
            <thead className="bg-neutral-50/50 text-neutral-500">
              <tr className="border-b border-neutral-200">
                <th className={`${th} w-[22%]`} scope="col">
                  Name
                </th>
                <th className={th} scope="col">
                  Secret key
                </th>
                <th className={`${th} w-[12%]`} scope="col">
                  Status
                </th>
                <th className={`${th} w-[14%]`} scope="col">
                  Created
                </th>
                <th className={`${th} w-[10%]`} scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {isLoading
                ? Array.from({ length: 3 }, (_, row) => (
                    <tr className="h-11" key={row}>
                      {Array.from({ length: 5 }, (__, col) => (
                        <td className={td} key={col}>
                          <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none" />
                        </td>
                      ))}
                    </tr>
                  ))
                : null}

              {!isLoading && apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title="No API keys"
                      action={
                        <Button size="sm" variant="secondary" onClick={() => setIsCreating(true)}>
                          Create your first key
                        </Button>
                      }
                    >
                      Create a key to start sending entries from your backend.
                    </EmptyState>
                  </td>
                </tr>
              ) : null}

              {apiKeys?.map((key) => (
                <tr key={key.id} className="h-11 text-neutral-700 hover:bg-neutral-50">
                  <td className={`${td} font-medium text-neutral-900`}>{key.name}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      {revealed[key.id] ? (
                        <CopyableText value={key.key} label="API key" />
                      ) : (
                        <span className="font-mono text-[12px] text-neutral-500">{maskKey(key.key)}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setRevealed((r) => ({ ...r, [key.id]: !r[key.id] }))}
                        className={`rounded px-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 ${focusRing}`}
                      >
                        {revealed[key.id] ? "Hide" : "Reveal"}
                      </button>
                    </div>
                  </td>
                  <td className={td}>{key.active ? <Pill tone="success">Active</Pill> : <Pill>Disabled</Pill>}</td>
                  <td className={td} title={formatDate(key.createdAt)}>
                    {formatRelative(key.createdAt)}
                  </td>
                  <td className={`${td} text-right`}>
                    <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => revoke(key)}>
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateKeyModal open={isCreating} onClose={() => setIsCreating(false)} onCreate={createKey} />
    </section>
  );
}

export default ApiKeys;
