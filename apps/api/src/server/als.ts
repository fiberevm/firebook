import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Request, Response } from "express";
import type { ApiKey, User } from "@accounting/db";

export type RequestContext = Partial<{
  user: User;
  key: ApiKey;
}>;

export const ctxStateALS = new AsyncLocalStorage<RequestContext>();

/**
 * Gives every request its own context object, so anything further down the
 * stack can call getRequestContext() instead of passing the user around.
 */
export function asyncLocalStorageMiddleware(_req: Request, _res: Response, next: NextFunction) {
  ctxStateALS.run({}, next);
}

export function updateContext(context: RequestContext) {
  const store = ctxStateALS.getStore();
  if (store) {
    Object.assign(store, context);
  } else {
    // outside of a request scope (e.g. middleware unit tests)
    ctxStateALS.enterWith({ ...context });
  }
}

/**
 * Get the current context of a request. See type at the top
 * of the file for the available resources.
 */
export function getRequestContext(): RequestContext {
  return ctxStateALS.getStore() ?? {};
}
