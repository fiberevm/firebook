import { Router, type Response } from "express";
import { config } from "../../../config";
import { FLOW_COOKIE } from "../../../services/oidc";
import { services } from "../../../services/services";

const router = Router();

// path the flow cookie is scoped to, so it is only sent back to the callback
const COOKIE_PATH = "/auth/oidc";

function readCookie(header: string | undefined, name: string) {
  for (const part of header?.split(";") ?? []) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

function cookieAttributes(maxAge: number) {
  const secure = config().apiUrl.startsWith("https://") ? "; Secure" : "";
  // Lax, not Strict: the callback is a top-level redirect from the identity provider
  return `Path=${COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

// back to the web app's sign-in page with a message
function failTo(res: Response, message: string) {
  res.setHeader("Set-Cookie", `${FLOW_COOKIE}=; ${cookieAttributes(0)}`);
  return res.redirect(302, `${config().appUrl}/?error=${encodeURIComponent(message)}`);
}

// send the browser to the identity provider
router.get("/oidc/login", async (_req, res) => {
  const result = await services().oidc.start();
  if (result.isErr()) return failTo(res, result.unwrapErr());
  const { url, cookie } = result.unwrap();
  res.setHeader("Set-Cookie", `${FLOW_COOKIE}=${encodeURIComponent(cookie)}; ${cookieAttributes(600)}`);
  return res.redirect(302, url);
});

// the identity provider sends the browser back here with a code
router.get("/oidc/callback", async (req, res) => {
  // e.g. the person cancelled, or the provider denied access
  if (typeof req.query.error === "string") {
    const description = typeof req.query.error_description === "string" ? req.query.error_description : req.query.error;
    return failTo(res, `Single sign-on failed: ${description}`);
  }

  // rebuild the public callback URL, so it matches the redirect URI behind proxies
  const callbackUrl = new URL(services().oidc.redirectUri());
  callbackUrl.search = new URL(req.originalUrl, "http://placeholder").search;

  const s = services();
  const user = await s.oidc.finish(callbackUrl, readCookie(req.headers.cookie, FLOW_COOKIE));
  if (user.isErr()) return failTo(res, user.unwrapErr());

  const token = await s.auth.getAuthToken(user.unwrap().id);
  res.setHeader("Set-Cookie", `${FLOW_COOKIE}=; ${cookieAttributes(0)}`);
  // the fragment never reaches a server or its logs
  return res.redirect(302, `${config().appUrl}/auth/callback#token=${encodeURIComponent(token)}`);
});

export default router;
