import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { AuthShell } from "../components/AuthShell";
import { Button } from "../components/ui/Button";
import { Field, FormError, focusRing } from "../components/ui/primitives";
import { useUser } from "../context/UserManager";
import { useCreateOrg } from "../hooks/useOrgs";

function NewOrgPage() {
  const { user } = useUser();
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createOrg = useCreateOrg();
  const navigate = useNavigate();
  const isFirst = user.organizations.length === 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    try {
      const org = await createOrg(orgName);
      navigate(`/o/${org.id}`);
    } catch (err) {
      setError((err as Error).message);
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={isFirst ? `Welcome, ${user.firstName}` : "New organization"}
      description={
        isFirst
          ? "Create an organization to start keeping books. You can invite your team afterwards."
          : "Each organization has its own entries, API keys and team."
      }
      footer={
        isFirst ? null : (
          <Link to="/" className={`rounded font-medium text-neutral-950 underline-offset-2 hover:underline ${focusRing}`}>
            ← Back
          </Link>
        )
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError>{error}</FormError>
        <Field id="orgName" label="Organization name" placeholder="Acme Labs" value={orgName} onChange={(e) => setOrgName(e.target.value)} required autoFocus />
        <Button type="submit" className="w-full" isLoading={isSubmitting} loadingLabel="Creating…">
          Create organization
        </Button>
      </form>
    </AuthShell>
  );
}

export default NewOrgPage;
