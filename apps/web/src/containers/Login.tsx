import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { login, useAuthSettings } from "../api/auth";
import { AuthShell } from "../components/AuthShell";
import Loader from "../components/Loader";
import { OrDivider, SsoButton } from "../components/SsoButton";
import { Button } from "../components/ui/Button";
import { Field, FormError, focusRing } from "../components/ui/primitives";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [params] = useSearchParams();
  // single sign-on failures come back as ?error=
  const [error, setError] = useState<string | undefined>(() => params.get("error") ?? undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { settings, isLoading } = useAuthSettings();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Loader />;
  const { password: passwordAuth, sso } = settings;

  return (
    <AuthShell
      title="Sign in"
      description="Welcome back. Sign in to your books."
      footer={
        passwordAuth.signup ? (
          <>
            New to Firebook?{" "}
            <Link to="/signup" className={`rounded font-medium text-neutral-950 underline-offset-2 hover:underline ${focusRing}`}>
              Create an account
            </Link>
          </>
        ) : undefined
      }
    >
      {sso ? (
        <>
          {!passwordAuth.enabled ? <FormError>{error}</FormError> : null}
          <div className={!passwordAuth.enabled && error ? "mt-4" : ""}>
            <SsoButton name={sso.name} variant={passwordAuth.enabled ? "secondary" : "primary"} />
          </div>
          {passwordAuth.enabled ? <OrDivider /> : null}
        </>
      ) : null}
      {passwordAuth.enabled ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormError>{error}</FormError>
          <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" isLoading={isSubmitting} loadingLabel="Signing in…">
            Sign in
          </Button>
        </form>
      ) : null}
    </AuthShell>
  );
}

export default Login;
