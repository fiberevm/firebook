import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { asyncLocalStorageMiddleware } from "./als";
import { dashboardDir, serveDashboard } from "./dashboard";
import { errorHandler } from "./error";
import { apiKeyAuth } from "./middlewares/api_key_auth";
import { authenticate } from "./middlewares/authentication";
import authRouter from "./routes/auth/router";
import internalRouter from "./routes/internal/router";
import mcpRouter from "./routes/mcp/router";
import v1Router from "./routes/v1/router";

// `dashboard` is the directory of the built dashboard to serve, or null for API only
export function getServer({ dashboard = dashboardDir() }: { dashboard?: string | null } = {}) {
  const app = express();
  const httpServer = createServer(app);

  app.set("trust proxy", 1);
  app.use(express.json({ limit: "1mb" }));
  app.use(cors());
  app.use(asyncLocalStorageMiddleware);

  app.get("/health", (_, res) => {
    res.sendStatus(200);
  });

  app.use("/auth", authRouter);

  // before the authenticated routes, so page loads are not asked for a token
  if (dashboard) serveDashboard(app, dashboard);

  // public v1 routes, authenticated with an api key
  app.use("/v1", apiKeyAuth, v1Router);

  // MCP server for AI agents, authenticated with an api key
  app.use("/mcp", apiKeyAuth, mcpRouter);

  // internal routes used by the web app, authenticated with a JWT
  app.use("/", authenticate, internalRouter);

  // not found
  app.use((_, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use(errorHandler);

  return httpServer;
}
