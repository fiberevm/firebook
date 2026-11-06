import type { NextFunction, Request, Response } from "express";
import logger from "../logger";
import { isProd } from "../env";

const log = logger("middleware/error");

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  const error = err instanceof Error ? err : new Error(String(err));
  // body-parser errors (e.g. invalid JSON) carry their own status
  const status = (err as { status?: number })?.status ?? 500;

  if (status >= 500) {
    log.error("Internal Server Error", error);
  }

  res.status(status);

  // in production, do not leak stack traces
  if (isProd()) {
    res.json({ error: true, message: status >= 500 ? "Internal Server Error" : error.message });
    return;
  }

  res.json({
    error: true,
    name: error.name,
    message: error.message,
    details: error.stack?.split("\n"),
  });
}
