import type { NextFunction, Request, Response } from "express";
import { services } from "../../services/services";
import { updateContext } from "../als";

// resolves the api key in the Authorization header (if any) into the request context
export async function apiKeyAuth(req: Request, _res: Response, next: NextFunction) {
  const apiKey = req.headers.authorization?.split(" ")[1];
  if (!apiKey) {
    return next();
  }

  const key = await services().apiKeys.getByKey(apiKey);
  if (key.isOk()) {
    updateContext({ key: key.unwrap() });
  }

  next();
}
