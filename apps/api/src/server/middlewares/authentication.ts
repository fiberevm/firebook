import type { NextFunction, Request, Response } from "express";
import { services } from "../../services/services";
import { updateContext } from "../als";

// authenticate a request using the JWT in the Authorization header
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const jwt = req.headers.authorization?.split(" ")[1];
  if (!jwt) {
    return next();
  }

  const s = services();
  const decoded = await s.auth.verifyJwt(jwt);
  if (decoded.isErr()) {
    return next();
  }

  const user = await s.users.get(decoded.unwrap().userId);
  if (user.isOk()) {
    updateContext({ user: user.unwrap() });
  }

  next();
}
