// Serves the built dashboard (apps/web/dist) from the API, so one service hosts both.
// In development the dashboard runs on Vite instead and this is skipped.
import express, { type Express } from "express";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

// apps/api/src/server -> apps/web/dist
export const DEFAULT_DASHBOARD_DIR = resolve(import.meta.dir, "../../../web/dist");

export function dashboardDir(): string | null {
  const dir = process.env.DASHBOARD_DIR ? resolve(process.env.DASHBOARD_DIR) : DEFAULT_DASHBOARD_DIR;
  return existsSync(join(dir, "index.html")) ? dir : null;
}

export function serveDashboard(app: Express, dir: string) {
  // hashed bundles never change, everything else (favicons, manifest) is revalidated
  app.use("/assets", express.static(join(dir, "assets"), { immutable: true, maxAge: "1y", index: false, fallthrough: false }));
  app.use(express.static(dir, { index: false, maxAge: 0 }));

  // client-side routes: a browser loading a page (not the app calling the API) gets index.html.
  // API calls are fetch requests, which do not ask for text/html.
  const index = join(dir, "index.html");
  app.get(/.*/, (req, res, next) => {
    if (!req.accepts("html") || !req.headers.accept?.includes("text/html")) return next();
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(index);
  });
}
