import { connect, disconnect, runMigrations } from "./index";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

connect(url);
await runMigrations();
await disconnect();
console.log("Migrations completed");
