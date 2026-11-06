import { useState } from "react";
import { startSso } from "../api/auth";
import { Button } from "./ui/Button";

/** "Continue with <provider>", starts the OIDC redirect flow. */
export function SsoButton({ name, variant = "secondary" }: { name: string; variant?: "primary" | "secondary" }) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      className="w-full"
      isLoading={isRedirecting}
      loadingLabel="Redirecting…"
      onClick={() => {
        setIsRedirecting(true);
        startSso();
      }}
    >
      Continue with {name}
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-neutral-400" role="separator">
      <span className="h-px flex-1 bg-neutral-200" />
      or
      <span className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}
