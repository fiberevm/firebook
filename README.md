<h1 align="center">Firebook</h1>

<p align="center"><strong>Accounting for crypto companies.</strong><br>Record income and expenses from your backend, valued in USD the moment they happen.</p>

<p align="center"><img src="docs/screenshot.png" alt="The Firebook overview: income, expenses and net for the last 12 months, a cash flow chart broken down by category, and totals by currency" width="100%"></p>

## What it is

Crypto businesses get paid and pay out in tokens whose price moves every minute, so "how much did we make this month?" is surprisingly hard to answer. Firebook is a small ledger built for that question.

Your backend sends each payment to the Firebook API as it happens: an amount, a currency, whether it's income or an expense, and optionally a category, tags and metadata. Firebook records the USD value at that moment, so your books reflect what the money was actually worth when it moved, not what it's worth today.

- **USD value at the time of the entry.** ETH is priced live from the Uniswap V3 USDC/ETH pool, and USD is 1:1. For anything else, or when you already know the exact value, pass `usdValue`.
- **Cash flow by category.** The overview breaks income and expenses down by category per day, week or month, and you can switch categories on and off.
- **An entry feed you can slice.** Filter by `key:value` tags, and open any entry to see its value, tags and metadata.
- **Built for teams.** Multiple organizations, admin and member roles, and API keys scoped to each organization.
- **Self-hostable.** Sign in with your own identity provider over OIDC (Cloudflare Access, Okta, Google…) and turn passwords off. See [Self-hosting](#self-hosting-sign-in-and-sso).

```bash
curl https://api.firebook.io/v1/entries \
  -H "Authorization: Bearer $FIREBOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 0.5, "currency": "eth", "type": "income", "category": "consulting", "tags": ["client:acme"] }'
```

## Repository

A [Bun](https://bun.sh) workspaces monorepo.

| Path              | What                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `apps/api`        | Express 5 API (`cmd/api.ts`) and ETH price worker (`cmd/worker.ts`)                               |
| `apps/web`        | React 19 + Vite + Tailwind v4 dashboard                                                           |
| `apps/marketing`  | Static landing page (Vite + Tailwind, no JS). `VITE_APP_URL` sets where the sign up button points |
| `packages/db`     | Drizzle schema, migrations and Postgres client                                                    |
| `packages/shared` | API response types and zod request schemas used by both apps                                      |

## Running it locally

You need [Bun](https://bun.sh) 1.4+ and Postgres.

```bash
bun install
cp apps/api/.env.example apps/api/.env     # set DATABASE_URL, DATABASE_TEST_URL, JWT_SECRET
cp apps/web/.env.example apps/web/.env.local
createdb accounting && createdb accounting_test
```

### Commands (from the repo root)

```bash
bun run dev          # API on :3000 (runs migrations on boot) + web on :5173
bun run worker       # refreshes the ETH price every 10s
bun run dev:marketing  # landing page on :5174
bun run test         # API tests against DATABASE_TEST_URL (tables are truncated!)
bun run typecheck    # all packages
bun run build        # all packages
bun run db:generate  # new migration after editing packages/db/src/schema.ts
bun run format       # prettier
```

`TEST_NETWORK=1 bun run test` also runs the test that reads the live Uniswap pool over `RPC_URL`.

## API

Create an API key on the **API keys** page, then:

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

`render.yaml` is a [Render](https://render.com) blueprint: the API and price worker are built from `apps/api/Dockerfile` with the repo root as the Docker context (the worker overrides the command), the dashboard and landing page are static sites, plus a Postgres database. Set `JWT_SECRET` (the same value on the API and worker), `VITE_API_ENDPOINT` on the dashboard and `VITE_APP_URL` on the landing page.
