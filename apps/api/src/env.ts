// Bun loads .env files automatically, no dotenv needed.
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const EnvironmentTypeSchema = z.enum(["production", "staging", "development", "test", "web-development"]);

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DATABASE_TEST_URL: z.string().optional(),
    ENV: EnvironmentTypeSchema.default("development"),
    DD_API_KEY: z.string().optional(),
    SERVICE_NAME: z.string().default("accounting-api"),
    PORT: z.coerce.number().int().default(3000),
    JWT_SECRET: z.string().min(1),
    RPC_URL: z.url().default("https://eth.merkle.io"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export function isProd() {
  return env.ENV === "production";
}

export function isTest() {
  return env.ENV === "test";
}
