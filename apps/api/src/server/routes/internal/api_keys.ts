import { Router } from "express";
import { services } from "../../../services/services";
import { getRequestContext } from "../../als";
import { serializeApiKey } from "./serializer";

const apiKeysRouter = Router();

// get all api keys for an org
apiKeysRouter.get("/organization/:org_id/api_keys", async (req, res) => {
  const keys = await services().apiKeys.list(req.params.org_id);
  if (keys.isErr()) {
    return res.status(500).json({ message: keys.unwrapErr() });
  }
  return res.json(keys.unwrap().map(serializeApiKey));
});

// create an api key for an org
apiKeysRouter.post("/organization/:org_id/api_keys", async (req, res) => {
  const { name, roles } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  const ctx = getRequestContext();
  const result = await services().apiKeys.create(req.params.org_id, ctx.user!.id, name.trim(), Array.isArray(roles) ? roles.map(String) : []);
  if (result.isErr()) {
    return res.status(500).json({ message: result.unwrapErr() });
  }
  return res.json(serializeApiKey(result.unwrap()));
});

// delete an api key for an org
apiKeysRouter.delete("/organization/:org_id/api_keys/:key_id", async (req, res) => {
  const result = await services().apiKeys.delete(req.params.org_id, req.params.key_id);
  if (result.isErr()) {
    return res.status(500).json({ message: result.unwrapErr() });
  }
  if (!result.unwrap()) {
    return res.status(404).json({ message: "API key not found" });
  }
  return res.json({ ok: true });
});

export default apiKeysRouter;
