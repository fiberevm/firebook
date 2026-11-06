// Instance configuration for self-hosting, read from a JSON file.
//
// The file is `firebook.config.json` in the working directory, or the path in
// FIREBOOK_CONFIG. Without a file, password sign-in is on and SSO is off.
// See firebook.config.example.json for every option.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const oidcSchema = z.object({
  // label on the sign-in button: "Continue with <name>"
  name: z.string().min(1).default("single sign-on"),
  // issuer URL; `<issuer>/.well-known/openid-configuration` must exist.
  // Cloudflare Access: https://<team>.cloudflareaccess.com/cdn-cgi/access/sso/oidc/<client id>
  issuer: z.url(),
  clientId: z.string().min(1),
  // optional here so the secret can stay out of the file: falls back to OIDC_CLIENT_SECRET
  clientSecret: z.string().min(1).optional(),
  scopes: z.array(z.string().min(1)).default(["openid", "email", "profile"]),
  // create a Firebook user the first time someone signs in with SSO
  autoCreateUsers: z.boolean().default(true),
  // only let these email domains sign in with SSO, e.g. ["example.com"]
  allowedEmailDomains: z.array(z.string().min(1).toLowerCase()).optional(),
});

const configSchema = z
  .object({
    // public URL of the dashboard, where SSO sends people back to.
    // Defaults to apiUrl when that is set, since the API serves the built dashboard
    appUrl: z.url().optional(),
    // public URL of this API; the SSO redirect URI is `<apiUrl>/auth/oidc/callback`.
    // Render sets RENDER_EXTERNAL_URL to the service's public URL
    apiUrl: z.url().default(process.env.RENDER_EXTERNAL_URL || "http://localhost:3000"),
    auth: z
      .object({
        password: z
          .object({
            // email + password sign-in
            enabled: z.boolean().default(true),
            // self-service account creation with a password
            signup: z.boolean().default(true),
          })
          .prefault({}),
        oidc: oidcSchema.optional(),
      })
      .prefault({}),
  })
  .refine((c) => c.auth.password.enabled || c.auth.oidc, {
    message: "auth.password.enabled is false and auth.oidc is not set, so nobody could sign in",
    path: ["auth"],
  });

export type Config = Omit<z.infer<typeof configSchema>, "appUrl"> & { appUrl: string };
export type OidcConfig = z.infer<typeof oidcSchema>;

export function parseConfig(raw: unknown, source = "config"): Config {
  const result = configSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid ${source}:\n${z.prettifyError(result.error)}`);
  }
  // with a real public URL the dashboard is served by this API; locally it runs on Vite
  const apiUrlIsPublic = (typeof raw === "object" && raw !== null && "apiUrl" in raw) || !!process.env.RENDER_EXTERNAL_URL;
  const appUrl = result.data.appUrl ?? (apiUrlIsPublic ? result.data.apiUrl : "http://localhost:5173");
  const config: Config = { ...result.data, appUrl };
  // trailing slashes would produce `//auth/...` URLs
  config.appUrl = config.appUrl.replace(/\/+$/, "");
  config.apiUrl = config.apiUrl.replace(/\/+$/, "");
  if (config.auth.oidc && !config.auth.oidc.clientSecret) {
    config.auth.oidc.clientSecret = process.env.OIDC_CLIENT_SECRET || undefined;
  }
  // signing up with a password makes no sense when password sign-in is off
  if (!config.auth.password.enabled) config.auth.password.signup = false;
  return config;
}

export function loadConfig(path = process.env.FIREBOOK_CONFIG): Config {
  const file = resolve(path ?? "firebook.config.json");
  if (!existsSync(file)) {
    if (path) throw new Error(`FIREBOOK_CONFIG points to ${file}, which does not exist`);
    return parseConfig({});
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`Could not read ${file}: ${(e as Error).message}`);
  }
  return parseConfig(raw, file);
}

let current: Config | null = null;

export function config(): Config {
  current ??= loadConfig();
  return current;
}

// replaces the loaded config, for tests
export function setConfig(next: Config | null) {
  current = next;
}
