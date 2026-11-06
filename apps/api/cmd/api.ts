import { connect, runMigrations } from "@accounting/db";
import { config } from "../src/config";
import { env } from "../src/env";
import logger from "../src/logger";
import { dashboardDir } from "../src/server/dashboard";
import { getServer } from "../src/server/server";

const log = logger("cmd/api");

// fail fast on a bad config file
const { auth } = config();
log.info(
  `Sign-in: password ${auth.password.enabled ? "on" : "off"}${auth.password.signup ? " (sign up on)" : ""}, SSO ${auth.oidc ? `on (${auth.oidc.issuer})` : "off"}`,
);

connect(env.DATABASE_URL);
log.info("Connected to database");

await runMigrations();
log.info("Migrations completed");

const dashboard = dashboardDir();
log.info(dashboard ? `Serving the dashboard from ${dashboard}` : "Dashboard build not found, serving the API only");

getServer({ dashboard }).listen(env.PORT, () => {
  log.info(`Server is running on port ${env.PORT}`);
});
