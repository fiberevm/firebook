import { connect, disconnect, runMigrations } from "@accounting/db";
import { env } from "../src/env";
import logger from "../src/logger";

const log = logger("cmd/migrate");

connect(env.DATABASE_URL);
log.info("Connected to database. Running migrations");

await runMigrations();
log.info("Migrations completed");

await disconnect();
