import type { ApiOrgMember } from "@accounting/shared";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { PlusIcon } from "../components/ui/icons";
import { Card, ErrorState, Field, FormError, PageHeader, Pill, td, th } from "../components/ui/primitives";
import { useUser } from "../context/UserManager";
import { useAddTeamMember, useRemoveTeamMember, useTeamMembers } from "../hooks/useTeamMembers";
import { formatDate } from "../lib/format";

function InviteModal({ open, onClose, onInvite }: { open: boolean; onClose: () => void; onInvite: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const close = () => {
    setEmail("");
    setError(undefined);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(undefined);
    try {
      await onInvite(email.trim());
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Add team member" description="They need a Firebook account first. Members can view entries and manage API keys.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError>{error}</FormError>
        <Field
          id="member-email"
          label="Email"
          type="email"
          placeholder="teammate@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} loadingLabel="Adding…">
            Add member
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Settings() {
  const { orgId = "" } = useParams();
  const { user } = useUser();
  const { teamMembers, isLoading, error } = useTeamMembers(orgId);
  const addTeamMember = useAddTeamMember(orgId);
  const removeTeamMember = useRemoveTeamMember(orgId);
  const [isInviting, setIsInviting] = useState(false);
  const [removeError, setRemoveError] = useState<string>();
  const org = user.organizations.find((o) => o.id === orgId);
  const isAdmin = teamMembers?.some((m) => m.user.id === user.id && m.role === "admin") ?? false;

  const handleRemove = async (member: ApiOrgMember) => {
    if (!window.confirm(`Remove ${member.user.firstName} ${member.user.lastName} from ${org?.name ?? "this organization"}?`)) return;
    setRemoveError(undefined);
    try {
      await removeTeamMember(member.user.id);
    } catch (err) {
      setRemoveError((err as Error).message);
    }
  };

  return (
    <section aria-labelledby="team-title">
      <PageHeader
        id="team-title"
        title="Team"
        count={teamMembers?.length ?? "…"}
        description={`People with access to ${org?.name ?? "this organization"}. Organizations can have up to 15 members.`}
        actions={
          isAdmin ? (
            <Button onClick={() => setIsInviting(true)}>
              <PlusIcon className="size-4" /> Add member
            </Button>
          ) : null
        }
      />

      {removeError ? (
        <div className="mt-4">
          <FormError>{removeError}</FormError>
        </div>
      ) : null}

      <Card className="mt-6">
        {error ? (
          <ErrorState title="Could not load team members" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs">
              <caption className="sr-only">Team members</caption>
              <thead className="bg-neutral-50/50 text-neutral-500">
                <tr className="border-b border-neutral-200">
                  <th className={th} scope="col">
                    Member
                  </th>
                  <th className={`${th} w-[14%]`} scope="col">
                    Role
                  </th>
                  <th className={`${th} w-[16%]`} scope="col">
                    Joined
                  </th>
                  <th className={`${th} w-[12%]`} scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {isLoading
                  ? Array.from({ length: 2 }, (_, row) => (
                      <tr className="h-12" key={row}>
                        {Array.from({ length: 4 }, (__, col) => (
                          <td className={td} key={col}>
                            <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-200 motion-reduce:animate-none" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : null}
                {teamMembers?.map((member) => {
                  const isYou = member.user.id === user.id;
                  return (
                    <tr key={member.id} className="h-12 text-neutral-700 hover:bg-neutral-50">
                      <td className={td}>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="grid size-7 shrink-0 place-items-center rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-600"
                            aria-hidden="true"
                          >
                            {member.user.firstName.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 leading-tight">
                            <p className="truncate text-[13px] font-medium text-neutral-900">
                              {member.user.firstName} {member.user.lastName}
                              {isYou ? <span className="ml-1.5 font-normal text-neutral-500">(you)</span> : null}
                            </p>
                            <p className="mt-0.5 truncate text-neutral-500">{member.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={td}>{member.role === "admin" ? <Pill tone="info">Admin</Pill> : <Pill>Member</Pill>}</td>
                      <td className={td}>{formatDate(member.createdAt)}</td>
                      <td className={`${td} text-right`}>
                        {isAdmin && !isYou ? (
                          <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => handleRemove(member)}>
                            Remove
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <InviteModal open={isInviting} onClose={() => setIsInviting(false)} onInvite={addTeamMember} />
    </section>
  );
}

export default Settings;
