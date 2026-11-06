import { randomBytes } from "node:crypto";
import { Err, Ok, type Result } from "oxide.ts";
import { and, eq, isNull } from "drizzle-orm";
import { apiKeysTable, db, type ApiKey } from "@accounting/db";

class ApiKeysService {
  async create(organizationId: string, createdById: string, name: string, roles: string[]): Promise<Result<ApiKey, string>> {
    const key = `firebooks_${randomBytes(24).toString("base64url")}`;

    try {
      const [result] = await db().insert(apiKeysTable).values({ organizationId, createdById, name, roles, key, active: true }).returning();
      return Ok(result!);
    } catch (error) {
      return Err((error as Error).message);
    }
  }

  async list(organizationId: string): Promise<Result<ApiKey[], string>> {
    try {
      const result = await db()
        .select()
        .from(apiKeysTable)
        .where(and(eq(apiKeysTable.organizationId, organizationId), isNull(apiKeysTable.deletedAt)));
      return Ok(result);
    } catch (error) {
      return Err((error as Error).message);
    }
  }

  // soft-deletes a key, scoped to the organization so keys of other orgs can't be deleted
  async delete(organizationId: string, id: string): Promise<Result<boolean, string>> {
    try {
      const result = await db()
        .update(apiKeysTable)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.organizationId, organizationId), isNull(apiKeysTable.deletedAt)))
        .returning({ id: apiKeysTable.id });
      return Ok(result.length > 0);
    } catch (error) {
      return Err((error as Error).message);
    }
  }

  // get an active key by its value
  async getByKey(key: string): Promise<Result<ApiKey, string>> {
    try {
      const [result] = await db()
        .select()
        .from(apiKeysTable)
        .where(and(eq(apiKeysTable.key, key), eq(apiKeysTable.active, true), isNull(apiKeysTable.deletedAt)))
        .limit(1);
      return result ? Ok(result) : Err("API key not found");
    } catch (error) {
      return Err((error as Error).message);
    }
  }
}

export default ApiKeysService;
