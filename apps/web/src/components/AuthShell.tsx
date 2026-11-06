import type { ReactNode } from "react";
import { BrandMark } from "./AppLayout";

/** Quiet single-column surface for sign in, sign up and onboarding. */
export function AuthShell({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-white font-sans text-neutral-950 antialiased">
      <header className="flex h-14 items-center gap-2.5 px-4 sm:px-6">
        <BrandMark />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-neutral-950">Firebook</p>
          <p className="text-[11px] text-neutral-500">Accounting for crypto companies</p>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[23rem] items-center px-6 pb-20 pt-8 sm:px-4">
        <div className="w-full">
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950">{title}</h1>
          {description ? <p className="mt-1.5 text-sm leading-6 text-neutral-600">{description}</p> : null}
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 text-[13px] text-neutral-600">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
