import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { asyncLocalStorageMiddleware } from "./als";
import { errorHandler } from "./error";
import { apiKeyAuth } from "./middlewares/api_key_auth";
import { authenticate } from "./middlewares/authentication";
import authRouter from "./routes/auth/router";
import internalRouter from "./routes/internal/router";
import v1Router from "./routes/v1/router";

export function getServer() {
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

  // public v1 routes, authenticated with an api key
  app.use("/v1", apiKeyAuth, v1Router);

  // internal routes used by the web app, authenticated with a JWT
  app.use("/", authenticate, internalRouter);

  // not found
  app.use((_, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use(errorHandler);

  return httpServer;
}
