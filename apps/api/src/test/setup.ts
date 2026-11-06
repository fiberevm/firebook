import { afterAll, beforeAll, beforeEach } from "bun:test";
import { connect, disconnect, runMigrations, truncateAll } from "@accounting/db";
import { parseConfig, setConfig } from "../config";
import { env } from "../env";

beforeAll(async () => {
  if (env.ENV !== "test") {
    throw new Error("Tests must run with ENV=test");
  }
  if (!env.DATABASE_TEST_URL || env.DATABASE_TEST_URL === env.DATABASE_URL) {
    throw new Error("DATABASE_TEST_URL must be set and differ from DATABASE_URL (tests truncate every table)");
  }
  connect(env.DATABASE_TEST_URL);
  await runMigrations();
});

beforeEach(async () => {
  await truncateAll();
  // defaults, regardless of any local firebook.config.json; tests override as needed
  setConfig(parseConfig({}));
});

afterAll(async () => {
  await disconnect();
});
