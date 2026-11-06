import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

export * from "./schema";
export { schema };

export type Database = NodePgDatabase<typeof schema> & { $client: import("pg").Pool };

// absolute path, so migrations work regardless of the process cwd
export const MIGRATIONS_FOLDER = fileURLToPath(new URL("../migrations", import.meta.url));

let globalDB: Database | null = null;

export function connect(connectionString: string): Database {
  if (globalDB !== null) {
    throw new Error("Database already connected");
  }
  globalDB = drizzle({
    // columns are `timestamp without time zone` and drizzle reads/writes them as UTC,
    // so the session must be UTC too, otherwise defaultNow() columns are skewed by the server's offset
    connection: { connectionString, options: "-c TimeZone=UTC" },
    schema,
  }) as Database;
  return globalDB;
}

export function db(): Database {
  if (globalDB === null) {
    throw new Error("Database not connected");
  }
  return globalDB;
}

export async function disconnect() {
  if (globalDB !== null) {
    await globalDB.$client.end();
    globalDB = null;
  }
}

// runs pending migrations, skipping the ones already applied
export async function runMigrations(database: Database = db()) {
  await migrate(database, { migrationsFolder: MIGRATIONS_FOLDER });
}

// truncates every table in the public schema. Only meant for tests.
export async function truncateAll(database: Database = db()) {
  const tables = await database.execute<{ table_name: string }>(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  if (tables.rows.length === 0) return;
  const names = tables.rows.map((t) => `"${t.table_name}"`).join(", ");
  await database.execute(sql.raw(`TRUNCATE TABLE ${names} CASCADE;`));
}
