import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import request from "supertest";
import { parseConfig, setConfig } from "../../../config";
import { services } from "../../../services/services";
import { getServer } from "../../server";

// a minimal OIDC provider: discovery, JWKS, and a token endpoint that signs an ID token
// with whatever claims the test registered for the authorization code
const { publicKey, privateKey } = await generateKeyPair("RS256");
const codes = new Map<string, { nonce: string; claims: Record<string, unknown> }>();
let issuer = "";
let idp: ReturnType<typeof Bun.serve>;

beforeAll(async () => {
  const jwk = { ...(await exportJWK(publicKey)), kid: "test", alg: "RS256", use: "sig" };
  idp = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/.well-known/openid-configuration") {
        return Response.json({
          issuer,
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/token`,
          jwks_uri: `${issuer}/jwks`,
          response_types_supported: ["code"],
          subject_types_supported: ["public"],
          id_token_signing_alg_values_supported: ["RS256"],
        });
      }
      if (url.pathname === "/jwks") return Response.json({ keys: [jwk] });
      if (url.pathname === "/token" && req.method === "POST") {
        const form = new URLSearchParams(await req.text());
        const pending = codes.get(form.get("code") ?? "");
        if (!pending || !form.get("code_verifier")) return Response.json({ error: "invalid_grant" }, { status: 400 });
        const idToken = await new SignJWT({ nonce: pending.nonce, ...pending.claims })
          .setProtectedHeader({ alg: "RS256", kid: "test" })
          .setIssuer(issuer)
          .setAudience("firebook")
          .setSubject("user-1")
          .setIssuedAt()
          .setExpirationTime("5m")
          .sign(privateKey);
        return Response.json({ access_token: "at", token_type: "Bearer", expires_in: 300, id_token: idToken });
      }
      return new Response("not found", { status: 404 });
    },
  });
  issuer = `http://localhost:${idp.port}`;
});

afterAll(() => idp.stop(true));

function configure(oidc: Record<string, unknown> = {}, password: Record<string, unknown> = {}) {
  setConfig(
    parseConfig({
      appUrl: "http://app.test",
      apiUrl: "http://api.test",
      auth: { password, oidc: { name: "Cloudflare", issuer, clientId: "firebook", clientSecret: "shh", ...oidc } },
    }),
  );
}

// runs the browser side of the flow: start, "log in" at the provider, come back with a code
async function signIn(claims: Record<string, unknown>, tamper?: { state?: string; dropCookie?: boolean }) {
  const app = getServer();
  const start = await request(app).get("/auth/oidc/login");
  expect(start.status).toBe(302);
  const authorize = new URL(start.headers.location!);
  const cookie = (start.headers["set-cookie"] as unknown as string[])[0]!.split(";")[0]!;

  const code = crypto.randomUUID();
  codes.set(code, { nonce: authorize.searchParams.get("nonce")!, claims });
  const state = tamper?.state ?? authorize.searchParams.get("state")!;
  const callback = request(app).get(`/auth/oidc/callback?code=${code}&state=${state}`);
  return { authorize, response: await (tamper?.dropCookie ? callback : callback.set("Cookie", cookie)) };
}

const tokenFrom = (location: string) => decodeURIComponent(new URL(location).hash.replace("#token=", ""));
const errorFrom = (location: string) => new URL(location).searchParams.get("error");

describe("auth settings", () => {
  it("defaults to password sign-in only", async () => {
    const res = await request(getServer()).get("/auth/settings");
    expect(res.body).toEqual({ password: { enabled: true, signup: true }, sso: null });
  });

  it("reports SSO and disabled passwords", async () => {
    configure({}, { enabled: false });
    const res = await request(getServer()).get("/auth/settings");
    expect(res.body).toEqual({ password: { enabled: false, signup: false }, sso: { name: "Cloudflare" } });
  });

  it("rejects password login and sign up when disabled", async () => {
    await services().auth.register({ email: "a@test.com", password: "password", firstName: "a", lastName: "b" });
    configure({}, { enabled: false });
    const app = getServer();
    expect((await request(app).post("/auth/login").send({ email: "a@test.com", password: "password" })).status).toBe(403);
    expect((await request(app).post("/auth/register").send({ email: "b@test.com", password: "password", firstName: "a", lastName: "b" })).status).toBe(403);
  });

  it("can keep password sign-in but close sign up", async () => {
    configure({}, { signup: false });
    expect((await request(getServer()).post("/auth/register").send({ email: "b@test.com", password: "password", firstName: "a", lastName: "b" })).status).toBe(
      403,
    );
  });

  it("sends SSO back to the API's own URL by default, since it serves the dashboard", () => {
    expect(parseConfig({ apiUrl: "https://books.example.com/" }).appUrl).toBe("https://books.example.com");
    expect(parseConfig({}).appUrl).toBe("http://localhost:5173");
    expect(parseConfig({ apiUrl: "https://api.example.com", appUrl: "https://app.example.com" }).appUrl).toBe("https://app.example.com");
  });

  it("refuses a config where nobody could sign in", () => {
    expect(() => parseConfig({ auth: { password: { enabled: false } } })).toThrow(/nobody could sign in/);
  });
});

describe("OIDC sign-in", () => {
  beforeEach(() => configure());

  it("redirects to the provider with PKCE, state and nonce", async () => {
    const { authorize } = await signIn({ email: "x@test.com" });
    expect(authorize.origin + authorize.pathname).toBe(`${issuer}/authorize`);
    expect(authorize.searchParams.get("client_id")).toBe("firebook");
    expect(authorize.searchParams.get("redirect_uri")).toBe("http://api.test/auth/oidc/callback");
    expect(authorize.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorize.searchParams.get("scope")).toBe("openid email profile");
  });

  it("creates a user on first sign-in and returns a session token to the app", async () => {
    const { response } = await signIn({ email: "New.Person@Test.com", name: "New Person" });
    expect(response.status).toBe(302);
    expect(response.headers.location).toStartWith("http://app.test/auth/callback#token=");

    const user = (await services().users.getByEmail("new.person@test.com")).unwrap();
    expect([user.firstName, user.lastName, user.passwordHash]).toEqual(["New", "Person", null]);
    const session = await services().auth.verifyJwt(tokenFrom(response.headers.location!));
    expect(session.unwrap().userId).toBe(user.id);

    // and the token works against the internal API
    const me = await request(getServer())
      .get("/user")
      .set("Authorization", `Bearer ${tokenFrom(response.headers.location!)}`);
    expect(me.status).toBe(200);
  });

  it("signs in an existing password user with the same email", async () => {
    const existing = (await services().auth.register({ email: "a@test.com", password: "password", firstName: "a", lastName: "b" })).unwrap();
    const { response } = await signIn({ email: "a@test.com", email_verified: true });
    expect((await services().auth.verifyJwt(tokenFrom(response.headers.location!))).unwrap().userId).toBe(existing.id);
  });

  it("does not create users when autoCreateUsers is off", async () => {
    configure({ autoCreateUsers: false });
    const { response } = await signIn({ email: "x@test.com" });
    expect(errorFrom(response.headers.location!)).toContain("No Firebook account");
    expect((await services().users.getByEmail("x@test.com")).isErr()).toBe(true);
  });

  it("enforces allowedEmailDomains", async () => {
    configure({ allowedEmailDomains: ["Fiber.so"] });
    expect(errorFrom((await signIn({ email: "x@evil.com" })).response.headers.location!)).toContain("evil.com");
    expect((await signIn({ email: "x@fiber.so" })).response.headers.location).toContain("#token=");
  });

  it("rejects unverified emails and missing emails", async () => {
    expect(errorFrom((await signIn({ email: "x@test.com", email_verified: false })).response.headers.location!)).toContain("not verified");
    expect(errorFrom((await signIn({})).response.headers.location!)).toContain("email");
  });

  it("rejects a mismatched state or a missing flow cookie", async () => {
    expect(errorFrom((await signIn({ email: "x@test.com" }, { state: "forged" })).response.headers.location!)).toContain("could not be verified");
    expect(errorFrom((await signIn({ email: "x@test.com" }, { dropCookie: true })).response.headers.location!)).toContain("expired");
  });

  it("passes provider errors back to the app", async () => {
    const res = await request(getServer()).get("/auth/oidc/callback?error=access_denied&error_description=Denied");
    expect(errorFrom(res.headers.location!)).toBe("Single sign-on failed: Denied");
  });

  it("sends people back to the app when SSO is not configured", async () => {
    setConfig(parseConfig({ appUrl: "http://app.test" }));
    const res = await request(getServer()).get("/auth/oidc/login");
    expect(errorFrom(res.headers.location!)).toBe("Single sign-on is not configured");
  });
});
