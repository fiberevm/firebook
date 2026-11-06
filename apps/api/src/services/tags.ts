import { and, eq, inArray } from "drizzle-orm";
import { None, Ok, Some, type Option, type Result } from "oxide.ts";
import { db, tagsTable, type Tag } from "@accounting/db";

class TagsService {
  // create or get
  async insertOrGet(organizationId: string, key: string, value: string): Promise<Result<Tag, string>> {
    const existing = await this.getByKeyAndValueAndOrganizationId(organizationId, key, value);
    if (existing.isSome()) {
      return Ok(existing.unwrap());
    }

    const [newTag] = await db().insert(tagsTable).values({ organizationId, key, value }).returning();
    return Ok(newTag!);
  }

  async getMany(ids: string[]): Promise<Result<Tag[], string>> {
    if (ids.length === 0) return Ok([]);
    const result = await db().select().from(tagsTable).where(inArray(tagsTable.id, ids));
    return Ok(result);
  }

  async getByKeyAndValueAndOrganizationId(organizationId: string, key: string, value: string): Promise<Option<Tag>> {
    const [result] = await db()
      .select()
      .from(tagsTable)
      .where(and(eq(tagsTable.organizationId, organizationId), eq(tagsTable.key, key), eq(tagsTable.value, value)))
      .limit(1);
    return result ? Some(result) : None;
  }
}

export default TagsService;
