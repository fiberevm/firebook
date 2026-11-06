import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { register, useAuthSettings } from "../api/auth";
import { AuthShell } from "../components/AuthShell";
import Loader from "../components/Loader";
import { OrDivider, SsoButton } from "../components/SsoButton";
import { Button } from "../components/ui/Button";
import { Field, FormError, focusRing } from "../components/ui/primitives";

function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { settings, isLoading } = useAuthSettings();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    try {
      await register(firstName, lastName, email, password);
    } catch (err) {
      setError((err as Error).message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Loader />;
  const { password: passwordAuth, sso } = settings;

  return (
    <AuthShell
      title="Create your account"
      description="Track crypto income and expenses with real-time USD value."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/" className={`rounded font-medium text-neutral-950 underline-offset-2 hover:underline ${focusRing}`}>
            Sign in
          </Link>
        </>
      }
    >
      {sso ? <SsoButton name={sso.name} variant={passwordAuth.signup ? "secondary" : "primary"} /> : null}
      {sso && passwordAuth.signup ? <OrDivider /> : null}
      {!sso && !passwordAuth.signup ? (
        <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
          Sign up is turned off on this instance. Ask an admin to create an account for you.
        </p>
      ) : null}
      {passwordAuth.signup ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormError>{error}</FormError>
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="firstName"
              label="First name"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoFocus
            />
            <Field id="lastName" label="Last name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <Field id="email" label="Work email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            hint="At least 8 characters."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" isLoading={isSubmitting} loadingLabel="Creating account…">
            Create account
          </Button>
        </form>
      ) : null}
    </AuthShell>
  );
}

export default Register;
