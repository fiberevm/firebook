import jwt from "jsonwebtoken";
import * as client from "openid-client";
import { Err, Ok, type Result } from "oxide.ts";
import type { User } from "@accounting/db";
import { config, type OidcConfig } from "../config";
import { env } from "../env";
import logger from "../logger";
import { services } from "./services";

const log = logger("oidc");

// state, nonce and PKCE verifier for one sign-in attempt, kept in a signed cookie
type Flow = { state: string; nonce: string; verifier: string };

export const FLOW_COOKIE = "firebook_oidc";
const FLOW_TTL_SECONDS = 600;

// discovery is fetched once per issuer (services() builds new instances on every call), and retried if it failed
const discovered = new Map<string, Promise<client.Configuration>>();

class OidcService {
  settings(): OidcConfig | undefined {
    return config().auth.oidc;
  }

  redirectUri() {
    return `${config().apiUrl}/auth/oidc/callback`;
  }

  private async client(settings: OidcConfig) {
    const key = `${settings.issuer}|${settings.clientId}`;
    let configuration = discovered.get(key);
    if (!configuration) {
      const issuer = new URL(settings.issuer);
      configuration = client.discovery(
        issuer,
        settings.clientId,
        { redirect_uris: [this.redirectUri()] },
        settings.clientSecret ? client.ClientSecretPost(settings.clientSecret) : client.None(),
        // plain http is only accepted for local identity providers
        issuer.protocol === "http:" ? { execute: [client.allowInsecureRequests] } : undefined,
      );
      configuration.catch(() => discovered.delete(key));
      discovered.set(key, configuration);
    }
    return configuration;
  }

  // the identity provider URL to send the browser to, plus the cookie that proves the flow started here
  async start(): Promise<Result<{ url: string; cookie: string }, string>> {
    const settings = this.settings();
    if (!settings) return Err("Single sign-on is not configured");
    try {
      const configuration = await this.client(settings);
      const flow: Flow = { state: client.randomState(), nonce: client.randomNonce(), verifier: client.randomPKCECodeVerifier() };
      const url = client.buildAuthorizationUrl(configuration, {
        redirect_uri: this.redirectUri(),
        scope: settings.scopes.join(" "),
        state: flow.state,
        nonce: flow.nonce,
        code_challenge: await client.calculatePKCECodeChallenge(flow.verifier),
        code_challenge_method: "S256",
      });
      const cookie = jwt.sign(flow, env.JWT_SECRET, { expiresIn: FLOW_TTL_SECONDS, audience: FLOW_COOKIE });
      return Ok({ url: url.href, cookie });
    } catch (e) {
      log.error("Could not start single sign-on", e);
      return Err("Could not reach the identity provider");
    }
  }

  // exchanges the authorization code, checks the ID token and returns the matching Firebook user
  async finish(callbackUrl: URL, cookie: string | undefined): Promise<Result<User, string>> {
    const settings = this.settings();
    if (!settings) return Err("Single sign-on is not configured");

    let flow: Flow;
    try {
      flow = jwt.verify(cookie ?? "", env.JWT_SECRET, { audience: FLOW_COOKIE }) as Flow;
    } catch {
      return Err("Your sign-in attempt expired, try again");
    }

    let claims: client.IDToken;
    try {
      const configuration = await this.client(settings);
      const tokens = await client.authorizationCodeGrant(configuration, callbackUrl, {
        pkceCodeVerifier: flow.verifier,
        expectedState: flow.state,
        expectedNonce: flow.nonce,
        idTokenExpected: true,
      });
      claims = tokens.claims()!;
    } catch (e) {
      log.warn("Single sign-on callback rejected", e);
      return Err("The identity provider response could not be verified");
    }

    const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
    if (!email) return Err("The identity provider did not share an email address. Add the email scope");
    // providers that do not send email_verified (like Cloudflare Access) vouch for the email themselves
    if (claims.email_verified === false) return Err("Your email address is not verified with the identity provider");

    const domain = email.split("@")[1] ?? "";
    if (settings.allowedEmailDomains?.length && !settings.allowedEmailDomains.includes(domain)) {
      return Err(`Accounts from ${domain} cannot sign in here`);
    }

    const s = services();
    const existing = await s.users.getByEmail(email);
    if (existing.isOk()) return Ok(existing.unwrap());
    if (!settings.autoCreateUsers) return Err(`No Firebook account exists for ${email}. Ask an admin to create one`);

    const [firstName, lastName] = namesFrom(claims, email);
    return s.users.create({ email, firstName, lastName });
  }
}

function namesFrom(claims: client.IDToken, email: string): [string, string] {
  const given = typeof claims.given_name === "string" ? claims.given_name : "";
  const family = typeof claims.family_name === "string" ? claims.family_name : "";
  if (given || family) return [given, family];
  const full = typeof claims.name === "string" ? claims.name.trim() : "";
  if (full) {
    const [first = "", ...rest] = full.split(/\s+/);
    return [first, rest.join(" ")];
  }
  return [email.split("@")[0]!, ""];
}

export default OidcService;
