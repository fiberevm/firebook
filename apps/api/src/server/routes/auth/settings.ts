import { Router } from "express";
import type { AuthSettings } from "@accounting/shared";
import { config } from "../../../config";

const router = Router();

// which sign-in methods this instance offers, so the web app can render the right forms
router.get("/settings", (_req, res) => {
  const { password, oidc } = config().auth;
  const settings: AuthSettings = {
    password: { enabled: password.enabled, signup: password.signup },
    sso: oidc ? { name: oidc.name } : null,
  };
  return res.json(settings);
});

export default router;
