# Firebook accounting

Bun workspaces monorepo.

| Path              | What                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `apps/api`        | Express 5 API (`cmd/api.ts`) and ETH price worker (`cmd/worker.ts`)                               |
| `apps/web`        | React 19 + Vite + Tailwind v4 dashboard                                                           |
| `apps/marketing`  | Static landing page (Vite + Tailwind, no JS). `VITE_APP_URL` sets where the sign up button points |
| `packages/db`     | Drizzle schema, migrations and Postgres client                                                    |
| `packages/shared` | API response types and zod request schemas used by both apps                                      |

## Setup

```bash
bun install
cp apps/api/.env.example apps/api/.env     # set DATABASE_URL, DATABASE_TEST_URL, JWT_SECRET
cp apps/web/.env.example apps/web/.env.local
createdb accounting && createdb accounting_test
```

## Commands (from the repo root)

```bash
bun run dev          # API on :3000 (runs migrations on boot) + web on :5173
bun run worker       # refreshes the ETH price every 10s
bun run dev:marketing  # landing page on :5174
bun run test         # API tests against DATABASE_TEST_URL (tables are truncated!)
bun run typecheck    # all packages
bun run build        # all packages
bun run db:generate  # new migration after editing packages/db/src/schema.ts
```

`TEST_NETWORK=1 bun run test` also runs the test that reads the live Uniswap pool over `RPC_URL`.

## Public API

```
POST /v1/entries
Authorization: Bearer <api key>

{ "amount": 100.31, "currency": "eth", "type": "income", "category": "consulting", "usdValue": 254012.5, "tags": ["client:acme"], "metadata": { "invoice": "A-1" } }
```

Accepts a single entry or an array. `usdValue` (optional, ≥ 0) sets the entry's total USD value; when omitted it is computed from the current price × `amount`. Only `usd` and `eth` are priced automatically, so `sol`, `bnb` and `pol` entries need `usdValue`. `category` (optional, free text up to 255 characters) groups entries in the overview chart.

## Self-hosting: sign-in and SSO

Sign-in is configured with a JSON file: `firebook.config.json` in the API's working directory, or the path in `FIREBOOK_CONFIG`. Without one, email and password sign-in and sign up are on, and SSO is off. The API checks the file on boot and refuses to start if it is invalid.

```json
{
  "appUrl": "https://books.example.com",
  "apiUrl": "https://api.books.example.com",
  "auth": {
    "password": { "enabled": false },
    "oidc": {
      "name": "Cloudflare Access",
      "issuer": "https://your-team.cloudflareaccess.com/cdn-cgi/access/sso/oidc/your-client-id",
      "clientId": "your-client-id",
      "allowedEmailDomains": ["example.com"]
    }
  }
}
```

| Option                          | Default                          |                                                                                                         |
| ------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `appUrl`                        | `http://localhost:5173`          | Public URL of the web app. SSO sends people back here                                                   |
| `apiUrl`                        | `http://localhost:3000`          | Public URL of the API. The redirect URI to register with your provider is `<apiUrl>/auth/oidc/callback` |
| `auth.password.enabled`         | `true`                           | Email and password sign-in. Turning it off also turns off sign up                                       |
| `auth.password.signup`          | `true`                           | Self-service sign up with a password                                                                    |
| `auth.oidc.name`                | `single sign-on`                 | Button label: "Continue with …"                                                                         |
| `auth.oidc.issuer`              |                                  | OIDC issuer; `<issuer>/.well-known/openid-configuration` must exist                                     |
| `auth.oidc.clientId`            |                                  |                                                                                                         |
| `auth.oidc.clientSecret`        | `OIDC_CLIENT_SECRET` env         | Prefer the env var, so the secret stays out of the file                                                 |
| `auth.oidc.scopes`              | `["openid", "email", "profile"]` |                                                                                                         |
| `auth.oidc.autoCreateUsers`     | `true`                           | Create a Firebook user on first SSO sign-in. When off, only existing users can sign in                  |
| `auth.oidc.allowedEmailDomains` | any                              | Only these email domains can sign in with SSO                                                           |

SSO uses the authorization code flow with PKCE, state and nonce, and verifies the ID token. People are matched to Firebook users by email, so an existing password user can also sign in with SSO. An ID token with `email_verified: false` is rejected.

**Cloudflare Access:** in Zero Trust, go to Access → Applications → Add an application → SaaS, pick OIDC, and set the redirect URL to `<apiUrl>/auth/oidc/callback`. Copy the client ID, client secret and issuer into the config. Any other OIDC provider (Okta, Google, Authentik, Keycloak…) works the same way. See `apps/api/firebook.config.example.json`.

## Deploy

`render.yaml` builds both services from `apps/api/Dockerfile` with the repo root as the Docker context; the worker overrides the command.
